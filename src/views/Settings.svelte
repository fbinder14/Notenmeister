<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import { randomId } from '../lib/crypto/encoding';
  import { MIN_PASSWORD_LENGTH, WrongPasswordError } from '../lib/crypto/vault';
  import { validateThresholds } from '../lib/domain/gradeKey';
  import { suggestYear, SUBJECT_COLORS } from '../lib/domain/defaults';
  import { gradeKeyChangeCount, gradeKeyUsage, removeGradeKey, removeSubject, subjectInUse, updateSubject } from '../lib/state/actions';
  import { backupFileName } from '../lib/storage/backupFile';
  import { chooseBackupDir, folderBackupSupported, forgetBackupDir, KEEP } from '../lib/storage/folderBackup';
  import type { AssessmentType, GradeKey } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Modal from '../ui/Modal.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { SUBJECT_DOT } from '../ui/colors';

  const core = $derived(app.core);
  const s = $derived(app.core.settings);
  const touch = () => app.touch();

  // Design und Rundung werden über Segmented gebunden; Änderungen speichern.
  let initial = true;
  $effect(() => {
    void s.theme;
    void s.rounding;
    if (initial) {
      initial = false;
      return;
    }
    touch();
  });

  // ---- Sicherung ----
  async function exportFile() {
    try {
      const text = await app.exportBackup();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: backupFileName() });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Verschlüsselte Sicherung exportiert.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  let importOpen = $state(false);
  let importText = $state<string | null>(null);
  let importName = $state('');
  let importPw = $state('');
  let importErr = $state('');
  async function pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    importName = f.name;
    importText = await f.text();
  }
  async function doImport() {
    if (!importText) return;
    importErr = '';
    try {
      await app.importBackup(importText, importPw);
      importOpen = false;
      toast.success('Sicherung wiederhergestellt. Ab jetzt gilt das Passwort der Sicherung.');
    } catch (e) {
      importErr = e instanceof WrongPasswordError ? 'Das Passwort passt nicht zu dieser Sicherung.' : (e as Error).message;
    }
  }

  async function pickFolder() {
    try {
      await chooseBackupDir();
      await app.refreshFolderBackup();
      if (await app.runFolderBackupNow()) toast.success('Ordner gewählt, erste Sicherung geschrieben.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error((e as Error).message);
    }
  }
  async function backupNow() {
    if (await app.runFolderBackupNow()) toast.success('Sicherung in den Ordner geschrieben.');
  }
  async function forgetFolder() {
    await forgetBackupDir();
    await app.refreshFolderBackup();
  }

  // ---- Passwort ----
  let pwOpen = $state(false);
  let pwOld = $state('');
  let pwNew = $state('');
  let pwNew2 = $state('');
  let pwErr = $state('');
  let pwBusy = $state(false);
  async function changePw(e: Event) {
    e.preventDefault();
    pwErr = '';
    pwBusy = true;
    try {
      await app.changePassword(pwOld, pwNew);
      pwOpen = false;
      pwOld = pwNew = pwNew2 = '';
      toast.success('Passwort geändert. Ältere Sicherungsdateien behalten ihr altes Passwort.');
    } catch (err) {
      pwErr = err instanceof WrongPasswordError ? 'Das bisherige Passwort ist falsch.' : (err as Error).message;
    } finally {
      pwBusy = false;
    }
  }

  // ---- Schuljahre ----
  function addYear() {
    const last = core.years.at(-1);
    const base = last ? new Date(`${last.end}T12:00`) : new Date();
    if (last) base.setMonth(base.getMonth() + 2);
    const y = suggestYear(base);
    core.years.push(y);
    touch();
  }
  function activate(id: string) {
    s.activeYearId = id;
    touch();
    toast.info(`Schuljahr ${core.years.find((y) => y.id === id)?.name} aktiv.`);
  }

  // ---- Arten ----
  function addType() {
    const t: AssessmentType = {
      id: `typ-${randomId().slice(0, 8)}`,
      kind: 'eigene',
      name: 'Neue Art',
      short: 'N',
      category: 'klein',
      mode: 'schriftlich',
      weight: 1,
      announced: false,
      countsForDayLimit: false,
      builtin: false,
    };
    core.types.push(t);
    touch();
  }

  // ---- Notenschlüssel ----
  let keyErr = $state<Record<string, string>>({});
  function setThreshold(k: GradeKey, i: number, v: number) {
    const next = [...k.thresholds] as GradeKey['thresholds'];
    next[i] = v;
    const err = validateThresholds(next);
    keyErr[k.id] = err ?? '';
    if (!err) {
      k.thresholds = next;
      touch();
    }
  }
  function addKey() {
    core.gradeKeys.push({ id: `key-${randomId().slice(0, 8)}`, name: 'Eigener Schlüssel', thresholds: [90, 78, 65, 50, 25], step: 0.5 });
    touch();
  }

  // Löschen mit Rückfrage; verwendete Schlüssel brauchen einen Ersatz.
  let delKey = $state<GradeKey | null>(null);
  let delReplacement = $state('');
  const delUsage = $derived(delKey ? gradeKeyUsage(delKey.id) : []);
  const delChanges = $derived(delKey && delReplacement ? gradeKeyChangeCount(delKey.id, delReplacement) : 0);
  const delOthers = $derived(core.gradeKeys.filter((k) => k.id !== delKey?.id));
  function askRemoveKey(k: GradeKey) {
    delKey = k;
    const others = core.gradeKeys.filter((x) => x.id !== k.id);
    delReplacement = (others.find((x) => x.id === s.defaultGradeKeyId) ?? others[0]).id;
  }
  function confirmRemoveKey() {
    if (!delKey) return;
    const name = delKey.name;
    removeGradeKey(delKey.id, delReplacement);
    delKey = null;
    toast.success(`Notenschlüssel „${name}“ gelöscht.`);
  }

  // ---- Alles löschen ----
  let wipeOpen = $state(false);
  let wipeConfirm = $state('');
</script>

<PageHeader title="Einstellungen" eyebrow="Alles bleibt lokal in diesem Browser" />

<div class="mx-auto grid max-w-4xl gap-6 px-8 py-7">
  <!-- Sicherheit und Sicherung -->
  <section class="card p-6">
    <div class="mb-5 flex items-center gap-3">
      <span class="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Icon name="shield" size={18} /></span>
      <div>
        <h2 class="text-[0.9375rem] font-semibold">Sicherheit und Sicherung</h2>
        <p class="text-[0.78125rem] text-slate-500">AES-256-GCM, Schlüssel aus dem Master-Passwort (PBKDF2, 600.000 Runden). Exporte sind immer verschlüsselt.</p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <button class="btn btn-soft h-11 justify-start" onclick={exportFile}><Icon name="download" size={16} /> Sicherung exportieren</button>
      <button class="btn btn-soft h-11 justify-start" onclick={() => { importOpen = true; importText = null; importName = ''; importPw = ''; importErr = ''; }}><Icon name="upload" size={16} /> Sicherung importieren</button>
      <button class="btn btn-soft h-11 justify-start" onclick={() => (pwOpen = true)}><Icon name="lock" size={16} /> Passwort ändern</button>
      <label class="flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 text-[0.8125rem] dark:border-line-dark">
        <span class="flex items-center gap-2"><Icon name="clock" size={16} /> Automatisch sperren nach</span>
        <select class="field h-8 w-32" bind:value={s.autoLockMinutes} onchange={touch}>
          {#each [5, 10, 15, 30, 60] as m (m)}<option value={m}>{m} Minuten</option>{/each}
          <option value={0}>nie</option>
        </select>
      </label>
    </div>

    <div class="mt-5 rounded-xl border border-slate-200 p-4 dark:border-line-dark">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-[0.84375rem] font-medium"><Icon name="folder" size={16} /> Automatische Sicherung in einen Ordner</div>
          <p class="mt-0.5 text-[0.75rem] text-slate-500">
            {#if !folderBackupSupported()}
              In diesem Browser nicht verfügbar (Chrome nötig).
            {:else if app.folderBackup.name}
              Ordner „{app.folderBackup.name}“ · {app.folderBackup.ok ? 'aktiv' : 'Berechtigung nötig'}{app.folderBackup.lastAt ? ` · zuletzt ${app.folderBackup.lastAt.toLocaleTimeString('de-DE')}` : ''} · die letzten {KEEP} Stände bleiben erhalten
            {:else}
              Schreibt nach Änderungen eine verschlüsselte Sicherung, z. B. auf einen USB-Stick oder in einen gesicherten Ordner.
            {/if}
          </p>
        </div>
        {#if folderBackupSupported()}
          <div class="flex gap-2">
            {#if app.folderBackup.name}
              <button class="btn btn-soft h-8" onclick={backupNow}>{app.folderBackup.ok ? 'Jetzt sichern' : 'Berechtigung erteilen'}</button>
              <button class="btn btn-ghost h-8" onclick={forgetFolder}>Trennen</button>
            {:else}
              <button class="btn btn-primary h-8" onclick={pickFolder}>Ordner wählen</button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    {#if !app.persisted}
      <p class="mt-3 flex items-center gap-2 text-[0.75rem] text-amber-700 dark:text-amber-300">
        <Icon name="alert" size={14} /> Der Browser hat dauerhaften Speicher nicht bestätigt. Installiere die App (Symbol in der Adressleiste) und sichere regelmäßig.
      </p>
    {/if}
  </section>

  <!-- Darstellung und Berechnung -->
  <section class="card grid gap-5 p-6">
    <h2 class="text-[0.9375rem] font-semibold">Darstellung und Berechnung</h2>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-[0.8125rem]">Design</span>
      <Segmented bind:value={s.theme} options={[{ value: 'system', label: 'System' }, { value: 'hell', label: 'Hell' }, { value: 'dunkel', label: 'Dunkel' }]} />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-[0.8125rem]">Vorschlag für die Zeugnisnote bei x,50</div>
        <div class="text-[0.75rem] text-slate-500">Nur ein Vorschlag – die Note setzt immer die Lehrkraft.</div>
      </div>
      <Segmented bind:value={s.rounding} options={[{ value: 'mild', label: 'bessere Note' }, { value: 'streng', label: 'schlechtere Note' }]} />
    </div>
  </section>

  <!-- Schuljahre -->
  <section class="card p-6">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-[0.9375rem] font-semibold">Schuljahre</h2>
      <button class="btn btn-soft h-8" onclick={addYear}><Icon name="plus" size={14} /> Schuljahr</button>
    </div>
    <div class="grid gap-2">
      {#each core.years as y (y.id)}
        <div class="grid grid-cols-[7rem_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl p-2 {s.activeYearId === y.id ? 'bg-brand-50/70 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30' : ''}">
          <input class="field h-8" bind:value={y.name} onchange={touch} />
          <label class="text-[0.6875rem] text-slate-500">Beginn<input class="field h-8" type="date" bind:value={y.start} onchange={touch} /></label>
          <label class="text-[0.6875rem] text-slate-500">2. Halbjahr ab<input class="field h-8" type="date" bind:value={y.halfSwitch} onchange={touch} /></label>
          <label class="text-[0.6875rem] text-slate-500">Ende<input class="field h-8" type="date" bind:value={y.end} onchange={touch} /></label>
          {#if s.activeYearId === y.id}
            <span class="px-3 text-[0.75rem] font-medium text-brand-700 dark:text-brand-300">aktiv</span>
          {:else}
            <button class="btn btn-ghost h-8" onclick={() => activate(y.id)}>Aktivieren</button>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Fächer -->
  <section class="card p-6">
    <h2 class="mb-4 text-[0.9375rem] font-semibold">Fächer</h2>
    {#if core.subjects.length}
      <div class="grid gap-2">
        {#each core.subjects as sub (sub.id)}
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              {#each SUBJECT_COLORS as c (c)}
                <button class="h-4 w-4 rounded-full transition {SUBJECT_DOT[c]} {sub.color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-panel-dark' : 'opacity-40 hover:opacity-100'}" onclick={() => updateSubject(sub.id, { color: c })} aria-label="Farbe {c}"></button>
              {/each}
            </div>
            <input class="field h-8 flex-1" value={sub.name} onchange={(e) => updateSubject(sub.id, { name: (e.target as HTMLInputElement).value })} />
            <input class="field h-8 w-20" value={sub.short} onchange={(e) => updateSubject(sub.id, { short: (e.target as HTMLInputElement).value })} />
            <button class="btn btn-ghost h-8 w-8 px-0 text-rose-600" disabled={subjectInUse(sub.id)} title={subjectInUse(sub.id) ? 'Wird in einem Unterricht verwendet' : 'Löschen'} onclick={() => removeSubject(sub.id)}><Icon name="trash" size={14} /></button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-[0.8125rem] text-slate-500">Fächer legst du beim Hinzufügen eines Unterrichts in einer Klasse an.</p>
    {/if}
  </section>

  <!-- Leistungsnachweise -->
  <section class="card p-6">
    <div class="mb-1 flex items-center justify-between">
      <h2 class="text-[0.9375rem] font-semibold">Arten von Leistungsnachweisen und Gewichte</h2>
      <button class="btn btn-soft h-8" onclick={addType}><Icon name="plus" size={14} /> Eigene Art</button>
    </div>
    <p class="mb-4 text-[0.78125rem] text-slate-500">Vorbelegt nach RSO §§ 17–19 und § 23. Das Gewicht kannst du hier allgemein und je Leistungsnachweis anpassen.</p>
    <table class="w-full text-[0.8125rem]">
      <thead class="text-left text-[0.6875rem] uppercase tracking-wider text-slate-400">
        <tr><th class="py-2 font-semibold">Bezeichnung</th><th class="font-semibold">Kürzel</th><th class="font-semibold">Kategorie</th><th class="font-semibold">Form</th><th class="font-semibold">Gewicht</th><th></th></tr>
      </thead>
      <tbody>
        {#each core.types as t (t.id)}
          <tr class="border-t border-slate-100 dark:border-line-dark {t.archived ? 'opacity-50' : ''}">
            <td class="py-1.5 pr-2">{#if t.builtin}{t.name}{:else}<input class="field h-8" bind:value={t.name} onchange={touch} />{/if}</td>
            <td class="pr-2"><input class="field h-8 w-16" bind:value={t.short} onchange={touch} /></td>
            <td class="pr-2">
              {#if t.builtin}{t.category === 'gross' ? 'groß' : 'klein'}{:else}
                <select class="field h-8 w-24" bind:value={t.category} onchange={touch}><option value="gross">groß</option><option value="klein">klein</option></select>
              {/if}
            </td>
            <td class="pr-2">
              {#if t.builtin}{t.mode}{:else}
                <select class="field h-8 w-32" bind:value={t.mode} onchange={touch}><option value="schriftlich">schriftlich</option><option value="muendlich">mündlich</option><option value="praktisch">praktisch</option></select>
              {/if}
            </td>
            <td class="pr-2"><input class="field h-8 w-20" type="number" min="0" step="0.5" bind:value={t.weight} onchange={touch} /></td>
            <td class="text-right">
              <button class="btn btn-ghost h-8 px-2 text-[0.75rem]" onclick={() => { t.archived = !t.archived; touch(); }}>{t.archived ? 'Einblenden' : 'Ausblenden'}</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Notenschlüssel -->
  <section class="card p-6">
    <div class="mb-1 flex items-center justify-between">
      <h2 class="text-[0.9375rem] font-semibold">Notenschlüssel</h2>
      <button class="btn btn-soft h-8" onclick={addKey}><Icon name="plus" size={14} /> Schlüssel</button>
    </div>
    <p class="mb-4 text-[0.78125rem] text-slate-500">Mindestanteil der Höchstpunktzahl in Prozent für die Noten 1 bis 5; darunter Note 6. Grenzen werden auf halbe Punkte aufgerundet.</p>
    <div class="grid gap-3">
      {#each core.gradeKeys as k (k.id)}
        <div class="rounded-xl border border-slate-200 p-3 dark:border-line-dark">
          <div class="flex flex-wrap items-center gap-2">
            <input class="field h-8 w-48" bind:value={k.name} onchange={touch} />
            {#each k.thresholds as v, i (i)}
              <label class="flex items-center gap-1 text-[0.75rem] text-slate-500">
                {i + 1}:<input class="field h-8 w-16" type="number" min="0" max="100" step="0.5" value={v} onchange={(e) => setThreshold(k, i, Number((e.target as HTMLInputElement).value))} />%
              </label>
            {/each}
            <label class="ml-auto flex items-center gap-1.5 text-[0.75rem]">
              <input type="radio" name="defkey" class="accent-brand-600" checked={s.defaultGradeKeyId === k.id} onchange={() => { s.defaultGradeKeyId = k.id; touch(); }} /> Standard
            </label>
            <button
              class="btn btn-ghost h-8 w-8 px-0 text-rose-600"
              disabled={core.gradeKeys.length < 2}
              title={core.gradeKeys.length < 2 ? 'Mindestens ein Notenschlüssel muss bleiben' : 'Löschen'}
              aria-label="Notenschlüssel {k.name} löschen"
              onclick={() => askRemoveKey(k)}><Icon name="trash" size={14} /></button
            >
          </div>
          {#if keyErr[k.id]}<p class="mt-1.5 text-[0.75rem] text-rose-600">{keyErr[k.id]}</p>{/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Gefahrenzone -->
  <section class="card border-rose-200 p-6 dark:border-rose-500/20">
    <h2 class="text-[0.9375rem] font-semibold text-rose-700 dark:text-rose-300">Alle Daten in diesem Browser löschen</h2>
    <p class="mt-1 text-[0.78125rem] text-slate-500">Löscht den verschlüsselten Tresor unwiderruflich. Exportierte Sicherungsdateien bleiben unberührt.</p>
    <button class="btn btn-danger mt-4" onclick={() => { wipeOpen = true; wipeConfirm = ''; }}><Icon name="trash" size={15} /> Alles löschen …</button>
  </section>

  <p class="pb-4 text-center text-[0.6875rem] text-slate-400">Notenmeister 2.0 · keine Netzwerkverbindungen · keine Telemetrie</p>
</div>

<Modal bind:open={importOpen} title="Sicherung importieren" width="max-w-md">
  <div class="grid gap-3">
    <p class="rounded-lg bg-amber-50 px-3 py-2 text-[0.78125rem] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Der aktuelle Bestand wird vollständig ersetzt. Danach gilt das Passwort der Sicherung.</p>
    <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-4 text-[0.8125rem] text-slate-500 hover:border-brand-300 dark:border-line-dark">
      <Icon name="upload" size={18} class="text-brand-500" /> {importName || 'Datei .notenmeister auswählen'}
      <input type="file" accept=".notenmeister,application/json" class="hidden" onchange={pick} />
    </label>
    <input class="field" type="password" placeholder="Passwort der Sicherung" bind:value={importPw} />
    {#if importErr}<p class="text-[0.78125rem] text-rose-600">{importErr}</p>{/if}
  </div>
  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => (importOpen = false)}>Abbrechen</button>
    <button class="btn btn-primary" disabled={!importText || !importPw} onclick={doImport}>Ersetzen und wiederherstellen</button>
  {/snippet}
</Modal>

<Modal bind:open={pwOpen} title="Master-Passwort ändern" width="max-w-md">
  <form id="pw-form" class="grid gap-3" onsubmit={changePw}>
    <input class="field" type="password" placeholder="Bisheriges Passwort" bind:value={pwOld} autocomplete="current-password" />
    <input class="field" type="password" placeholder="Neues Passwort (mind. {MIN_PASSWORD_LENGTH} Zeichen)" bind:value={pwNew} autocomplete="new-password" />
    <input class="field" type="password" placeholder="Neues Passwort wiederholen" bind:value={pwNew2} autocomplete="new-password" />
    {#if pwErr}<p class="text-[0.78125rem] text-rose-600">{pwErr}</p>{/if}
  </form>
  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => (pwOpen = false)}>Abbrechen</button>
    <button form="pw-form" class="btn btn-primary" disabled={!pwOld || pwNew.length < MIN_PASSWORD_LENGTH || pwNew !== pwNew2 || pwBusy}>Ändern</button>
  {/snippet}
</Modal>

<Modal open={!!delKey} onclose={() => (delKey = null)} title="Notenschlüssel löschen?" width="max-w-md">
  {#if delKey}
    <div class="grid gap-3 text-[0.8125rem] leading-relaxed">
      <p>Der Notenschlüssel <b>„{delKey.name}“</b> wird gelöscht. Das lässt sich nicht rückgängig machen.</p>
      {#if delUsage.length || s.defaultGradeKeyId === delKey.id}
        {#if delUsage.length}
          <p class="rounded-lg bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            Er wird von {delUsage.length === 1 ? 'einem Leistungsnachweis' : `${delUsage.length} Leistungsnachweisen`} verwendet:
            {delUsage.slice(0, 4).map((u) => `${u.cls.name} ${u.a.title}`).join(', ')}{delUsage.length > 4 ? ' …' : ''}.
            Diese wechseln auf den Ersatzschlüssel.
          </p>
        {/if}
        <label>
          <span class="label">Ersatzschlüssel</span>
          <select class="field" bind:value={delReplacement}>
            {#each delOthers as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
          </select>
        </label>
        {#if delUsage.length}
          <p class="text-[0.75rem] {delChanges ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-500'}">
            {delChanges
              ? `${delChanges} Note${delChanges === 1 ? ' ändert' : 'n ändern'} sich dadurch. Die alten Werte bleiben im Verlauf der Note sichtbar.`
              : 'Keine Note ändert sich dadurch.'}
          </p>
        {:else}
          <p class="text-[0.75rem] text-slate-500">Er ist der Standardschlüssel; der Ersatz wird neuer Standard.</p>
        {/if}
      {/if}
    </div>
  {/if}
  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => (delKey = null)}>Abbrechen</button>
    <button class="btn btn-danger" onclick={confirmRemoveKey}><Icon name="trash" size={15} /> Löschen</button>
  {/snippet}
</Modal>

<Modal bind:open={wipeOpen} title="Wirklich alles löschen?" width="max-w-md">
  <p class="text-[0.8125rem] leading-relaxed">Alle Klassen, Schüler und Noten in diesem Browser werden unwiderruflich gelöscht. Zum Bestätigen <b>LÖSCHEN</b> eintippen.</p>
  <input class="field mt-3" bind:value={wipeConfirm} />
  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => (wipeOpen = false)}>Abbrechen</button>
    <button class="btn btn-danger" disabled={wipeConfirm !== 'LÖSCHEN'} onclick={() => app.wipeAll()}>Endgültig löschen</button>
  {/snippet}
</Modal>
