import { BACKUP_EXT, backupFileName } from './backupFile';
import { getMeta, STORE_META, writeAll } from './idb';

/**
 * Automatische Sicherung in einen vom Nutzer gewählten Ordner (File System
 * Access API, Chrome). Das Ordner-Handle wird lokal gespeichert; es verrät
 * keinen Inhalt. Geschrieben werden nur verschlüsselte Sicherungsdateien.
 */

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  values(): AsyncIterable<FileSystemHandle>;
};

const KEY = 'backupDir';
export const KEEP = 10;

export const folderBackupSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export async function getBackupDir(): Promise<DirHandle | undefined> {
  return getMeta<DirHandle>(KEY);
}

export async function chooseBackupDir(): Promise<DirHandle> {
  const picker = (window as unknown as { showDirectoryPicker(o: object): Promise<DirHandle> }).showDirectoryPicker;
  const dir = await picker({ id: 'notenmeister-backup', mode: 'readwrite', startIn: 'documents' });
  await writeAll([{ store: STORE_META, key: KEY, value: dir }]);
  return dir;
}

export async function forgetBackupDir(): Promise<void> {
  await writeAll([{ store: STORE_META, key: KEY }]);
}

/** Prüft die Schreibberechtigung; fragt nur nach, wenn `interactive`. */
export async function ensurePermission(dir: DirHandle, interactive: boolean): Promise<boolean> {
  if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  if (!interactive) return false;
  return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
}

export async function writeBackup(dir: DirHandle, content: string): Promise<string> {
  const name = backupFileName();
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
  await rotate(dir);
  return name;
}

async function rotate(dir: DirHandle): Promise<void> {
  const files: string[] = [];
  for await (const h of dir.values()) {
    if (h.kind === 'file' && h.name.startsWith('Notenmeister_') && h.name.endsWith(BACKUP_EXT)) files.push(h.name);
  }
  files.sort();
  for (const name of files.slice(0, Math.max(0, files.length - KEEP))) {
    await dir.removeEntry(name);
  }
}
