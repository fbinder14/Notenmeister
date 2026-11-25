<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { toast } from '../../lib/state/toast.svelte';
  import { folderBackupSupported, KEEP } from '../../lib/storage/folderBackup';
  import Icon from '../../ui/Icon.svelte';

  const supported = folderBackupSupported();
  let busy = $state<'folder' | 'file' | null>(null);
  let failed = $state(false);

  const folderOk = $derived(!!app.folderBackup.name && app.folderBackup.ok);

  async function pickFolder() {
    busy = 'folder';
    failed = false;
    const r = await app.setupFolderBackup();
    busy = null;
    if (r === 'ok') toast.success('Sicherungsordner eingerichtet, erste Sicherung geschrieben.');
    else if (r === 'failed') failed = true;
  }

  async function download() {
    busy = 'file';
    try {
      await app.downloadBackup();
      toast.success('Verschlüsselte Sicherung heruntergeladen.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      busy = null;
    }
  }
</script>

<div class="grid gap-4">
  <div class="flex items-start gap-3 rounded-xl bg-sky-50 p-3.5 text-[0.8125rem] leading-snug text-sky-900 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20">
    <Icon name="info" size={17} class="mt-0.5 shrink-0" />
    <span>
      Deine Noten liegen <b>nur in diesem Browser</b>. Löscht jemand die Browserdaten oder geht der Computer kaputt, sind sie weg – außer es gibt eine Sicherung.
      Sicherungsdateien sind mit deinem Master-Passwort verschlüsselt.
    </span>
  </div>

  {#if supported}
    <div class="rounded-xl border p-4 transition {folderOk ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5' : 'border-brand-200 bg-white/70 dark:border-brand-500/30 dark:bg-white/[0.03]'}">
      <div class="flex items-start gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl {folderOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'}">
          <Icon name={folderOk ? 'check' : 'folder'} size={19} />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-[0.875rem] font-semibold">
            Automatisch in einen Ordner sichern
            {#if !folderOk}<span class="rounded-full bg-brand-100 px-2 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">empfohlen</span>{/if}
          </div>
          {#if folderOk}
            <p class="mt-0.5 text-[0.8125rem] text-emerald-800 dark:text-emerald-200">
              Eingerichtet: <b>„{app.folderBackup.name}“</b>. Nach Änderungen und beim Sperren wird automatisch gesichert; die letzten {KEEP} Sicherungen bleiben erhalten.
            </p>
          {:else}
            <p class="mt-0.5 text-[0.8125rem] text-slate-500">
              Wähle einmal einen Ordner, z. B. auf einem USB-Stick oder einem Laufwerk, das ohnehin gesichert wird. Danach läuft alles von selbst.
            </p>
          {/if}
          {#if failed}<p class="mt-1 text-[0.75rem] text-rose-600">Der Ordner ließ sich nicht verwenden. Bitte einen anderen wählen oder die Berechtigung erlauben.</p>{/if}
        </div>
        <button type="button" class="btn {folderOk ? 'btn-ghost' : 'btn-primary'} h-9 shrink-0" disabled={busy !== null} onclick={pickFolder}>
          {#if busy === 'folder'}<span class="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"></span>{/if}
          {folderOk ? 'Anderer Ordner' : 'Ordner wählen'}
        </button>
      </div>
    </div>
  {/if}

  <div class="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-line-dark dark:bg-white/[0.03]">
    <div class="flex items-start gap-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"><Icon name="download" size={19} /></span>
      <div class="min-w-0 flex-1">
        <div class="text-[0.875rem] font-semibold">Sicherungsdatei herunterladen</div>
        <p class="mt-0.5 text-[0.8125rem] text-slate-500">
          {supported ? 'Zusätzlich oder als Alternative: ' : ''}Eine Datei <code>.notenmeister</code>, die du selbst ablegst. Die Startseite erinnert dich, wenn die letzte Sicherung älter als eine Woche ist.
        </p>
        {#if app.lastBackupAt}
          <p class="mt-1 text-[0.75rem] text-emerald-700 dark:text-emerald-300">Letzte Sicherung: {app.lastBackupAt.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</p>
        {/if}
      </div>
      <button type="button" class="btn btn-soft h-9 shrink-0" disabled={busy !== null} onclick={download}>
        {#if busy === 'file'}<span class="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"></span>{/if}
        Herunterladen
      </button>
    </div>
  </div>

  {#if !app.persisted}
    <p class="flex items-center gap-2 px-1 text-[0.75rem] text-amber-700 dark:text-amber-300">
      <Icon name="alert" size={14} /> Der Browser hat dauerhaften Speicher nicht bestätigt. Installiere die App (Symbol in der Adressleiste) und sichere regelmäßig.
    </p>
  {/if}
</div>
