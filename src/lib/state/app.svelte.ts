import { changePassword as rewrap, createVault, unlockVault, type VaultHeader } from '../crypto/vault';
import { emptyCore } from '../domain/defaults';
import type { Core, Data, SchoolClass, SchoolYear } from '../domain/types';
import { backupFileName, buildBackup, openBackup, parseBackup } from '../storage/backupFile';
import { ensurePermission, getBackupDir, writeBackup } from '../storage/folderBackup';
import { getMeta, requestPersistence, STORE_META, wipe, writeAll } from '../storage/idb';
import { CORE_KEY, loadData, loadHeader, replaceAll, saveChunks, saveHeader } from '../storage/repository';
import { toast } from './toast.svelte';

type Phase = 'loading' | 'setup' | 'locked' | 'ready';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DELAY = 250;
const PUBLIC_KEY = 'notenmeister.public';

function readPublicFlag(): boolean {
  try {
    return localStorage.getItem(PUBLIC_KEY) === '1';
  } catch {
    return false;
  }
}
const FOLDER_BACKUP_DELAY = 60_000;
/** Zeitpunkt der letzten Sicherung (Export oder Ordner); nur ein Zeitstempel, unverschlüsselt. */
const LAST_BACKUP_KEY = 'lastBackupAt';

class App {
  phase = $state<Phase>('loading');
  data = $state<Data | null>(null);
  saveState = $state<SaveState>('idle');
  lastSavedAt = $state<Date | null>(null);
  folderBackup = $state<{ name: string | null; ok: boolean; lastAt: Date | null }>({ name: null, ok: false, lastAt: null });
  /** Letzte Sicherung, egal ob als Datei exportiert oder in den Ordner geschrieben. */
  lastBackupAt = $state<Date | null>(null);
  persisted = $state(false);
  /**
   * Öffentlicher Modus (Beamer, Schüler am Pult): nur Klassen- und Schülernamen,
   * Noten erst nach ausdrücklicher Rückfrage. Bleibt über Neuladen hinweg erhalten.
   */
  publicMode = $state(readPublicFlag());
  /** Eine neue Programmversion liegt bereit und wird beim Sperren geladen. */
  updateReady = false;

  #key: CryptoKey | null = null;
  #header: VaultHeader | null = null;
  #dirty = new Set<string>();
  #removed = new Set<string>();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #saving: Promise<void> | null = null;
  #backupTimer: ReturnType<typeof setTimeout> | null = null;
  #lastActivity = Date.now();

  get core(): Core {
    return this.data!.core;
  }

  get classes(): SchoolClass[] {
    return this.data!.classes;
  }

  get activeYear(): SchoolYear | undefined {
    const c = this.core;
    return c.years.find((y) => y.id === c.settings.activeYearId) ?? c.years.at(-1);
  }

  setPublicMode(on: boolean) {
    this.publicMode = on;
    try {
      localStorage.setItem(PUBLIC_KEY, on ? '1' : '0');
    } catch {
      /* ohne Speicher gilt der Modus nur bis zum Neuladen */
    }
  }

  /**
   * Verlässt den öffentlichen Modus nur mit dem Master-Passwort, damit niemand
   * am Pult per Tastenkürzel an die Noten kommt. Wirft `WrongPasswordError`.
   */
  async leavePublicMode(password: string) {
    if (!this.#header) throw new Error('Kein Tresor vorhanden.');
    await unlockVault(this.#header, password);
    this.setPublicMode(false);
  }

  async init() {
    try {
      const header = await loadHeader();
      this.phase = header ? 'locked' : 'setup';
      this.#header = header ?? null;
    } catch (e) {
      console.error(e);
      toast.error('Der lokale Speicher ist nicht verfügbar.');
      this.phase = 'setup';
    }
    this.#watchActivity();
  }

  async setup(password: string, year: SchoolYear) {
    const { header, key } = await createVault(password);
    const core = emptyCore();
    core.years.push(year);
    core.settings.activeYearId = year.id;
    const data: Data = { core, classes: [] };
    await replaceAll(header, key, data);
    this.#open(header, key, data);
    this.persisted = await requestPersistence();
  }

  async unlock(password: string) {
    const header = this.#header ?? (await loadHeader());
    if (!header) throw new Error('Kein Tresor vorhanden.');
    const key = await unlockVault(header, password);
    const data = await loadData(key);
    this.#open(header, key, data);
    this.persisted = await requestPersistence();
    void this.#initFolderBackup();
  }

  #open(header: VaultHeader, key: CryptoKey, data: Data) {
    this.#header = header;
    this.#key = key;
    this.data = data;
    this.#lastActivity = Date.now();
    this.phase = 'ready';
    this.saveState = 'idle';
  }

  /** Sperrt die App: speichert Ausstehendes und entfernt Schlüssel und Daten aus dem Speicher. */
  async lock() {
    if (this.phase !== 'ready') return;
    try {
      await this.flush();
      await this.#runFolderBackup(false);
    } catch (e) {
      console.error(e);
    }
    this.#key = null;
    this.data = null;
    this.#dirty.clear();
    this.#removed.clear();
    this.phase = 'locked';
    location.hash = '#/';
    if (this.updateReady) location.reload();
  }

  /** Merkt einen Block zum Speichern vor (`core` oder Klassen-ID). */
  touch(id: string = CORE_KEY) {
    this.#dirty.add(id);
    this.saveState = 'saving';
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), SAVE_DELAY);
  }

  removeClass(id: string) {
    const i = this.classes.findIndex((c) => c.id === id);
    if (i >= 0) this.classes.splice(i, 1);
    this.#dirty.delete(id);
    this.#removed.add(id);
    this.touch(CORE_KEY);
  }

  async flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (this.#saving) await this.#saving;
    if (!this.#key || !this.data || (!this.#dirty.size && !this.#removed.size)) return;
    const ids = [...this.#dirty];
    const removed = [...this.#removed];
    this.#dirty.clear();
    this.#removed.clear();
    const changed = ids
      .map((id) => ({
        id,
        value: id === CORE_KEY ? this.data!.core : this.data!.classes.find((c) => c.id === id),
      }))
      .filter((c): c is { id: string; value: Core | SchoolClass } => !!c.value)
      .map((c) => ({ id: c.id, value: $state.snapshot(c.value) as Core | SchoolClass }));
    this.#saving = saveChunks(this.#key, changed, removed)
      .then(() => {
        this.saveState = 'saved';
        this.lastSavedAt = new Date();
        this.#scheduleFolderBackup();
      })
      .catch((e) => {
        console.error(e);
        ids.forEach((id) => this.#dirty.add(id));
        removed.forEach((id) => this.#removed.add(id));
        this.saveState = 'error';
        toast.error('Speichern fehlgeschlagen. Bitte sofort eine Sicherung exportieren.');
      })
      .finally(() => {
        this.#saving = null;
      });
    await this.#saving;
  }

  async exportBackup(): Promise<string> {
    await this.flush();
    return buildBackup(this.#header!, this.#key!, $state.snapshot(this.data!) as Data);
  }

  /** Lädt eine verschlüsselte Sicherungsdatei herunter und merkt sich den Zeitpunkt. */
  async downloadBackup() {
    const text = await this.exportBackup();
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: backupFileName() });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await this.#markBackup();
  }

  async #markBackup(at = new Date()) {
    this.lastBackupAt = at;
    await writeAll([{ store: STORE_META, key: LAST_BACKUP_KEY, value: at.toISOString() }]).catch((e) => console.error(e));
  }

  /** Ersetzt den gesamten Bestand durch eine Sicherung. Danach gilt das Passwort der Sicherung. */
  async importBackup(text: string, password: string) {
    const { header, key, data } = await openBackup(parseBackup(text), password);
    await replaceAll(header, key, data);
    this.#open(header, key, data);
  }

  async changePassword(oldPw: string, newPw: string) {
    await this.flush();
    const header = await rewrap(this.#header!, oldPw, newPw);
    await saveHeader(header);
    this.#header = header;
    // Der Datenschlüssel bleibt gleich, die gespeicherten Blöcke bleiben gültig.
    this.#key = await unlockVault(header, newPw);
  }

  async wipeAll() {
    await wipe();
    this.#key = null;
    this.#header = null;
    this.data = null;
    this.phase = 'setup';
    location.hash = '#/';
  }

  // ---------- Automatische Ordner-Sicherung ----------

  async #initFolderBackup() {
    const dir = await getBackupDir().catch(() => undefined);
    this.folderBackup = { name: dir?.name ?? null, ok: dir ? await ensurePermission(dir, false) : false, lastAt: null };
    const last = await getMeta<string>(LAST_BACKUP_KEY).catch(() => undefined);
    this.lastBackupAt = last ? new Date(last) : null;
  }

  async refreshFolderBackup() {
    await this.#initFolderBackup();
  }

  #scheduleFolderBackup() {
    if (!this.folderBackup.name) return;
    if (this.#backupTimer) return;
    this.#backupTimer = setTimeout(() => {
      this.#backupTimer = null;
      void this.#runFolderBackup(false);
    }, FOLDER_BACKUP_DELAY);
  }

  async runFolderBackupNow() {
    return this.#runFolderBackup(true);
  }

  async #runFolderBackup(interactive: boolean): Promise<boolean> {
    if (!this.#key || !this.data) return false;
    const dir = await getBackupDir().catch(() => undefined);
    if (!dir) return false;
    const ok = await ensurePermission(dir, interactive).catch(() => false);
    this.folderBackup = { ...this.folderBackup, name: dir.name, ok };
    if (!ok) return false;
    try {
      await writeBackup(dir, await this.exportBackup());
      this.folderBackup = { name: dir.name, ok: true, lastAt: new Date() };
      await this.#markBackup(this.folderBackup.lastAt!);
      return true;
    } catch (e) {
      console.error(e);
      if (interactive) toast.error('Sicherung in den Ordner fehlgeschlagen.');
      return false;
    }
  }

  // ---------- Automatische Sperre ----------

  #watchActivity() {
    const bump = () => (this.#lastActivity = Date.now());
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
      addEventListener(ev, bump, { passive: true, capture: true });
    }
    setInterval(() => {
      if (this.phase !== 'ready' || !this.data) return;
      const mins = this.core.settings.autoLockMinutes;
      if (mins > 0 && Date.now() - this.#lastActivity > mins * 60_000) {
        void this.lock().then(() => toast.info('Automatisch gesperrt.'));
      }
    }, 15_000);
    addEventListener('pagehide', () => void this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush();
    });
  }
}

export const app = new App();
