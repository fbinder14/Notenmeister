<script lang="ts">
  import { backupAge, BACKUP_WARN_DAYS } from '../../lib/domain/dashboard';
  import { app } from '../../lib/state/app.svelte';
  import { href } from '../../lib/state/router.svelte';
  import { toast } from '../../lib/state/toast.svelte';
  import Icon from '../Icon.svelte';
  import Widget from '../Widget.svelte';

  /**
   * Stand der Datensicherung. Ist ein Sicherungsordner eingerichtet, schreibt
   * „Jetzt sichern“ dorthin, sonst wird eine verschlüsselte Datei heruntergeladen.
   */
  let busy = $state(false);

  const age = $derived(backupAge(app.lastBackupAt));
  const warn = $derived(age === null || age >= BACKUP_WARN_DAYS);
  const folder = $derived(app.folderBackup.name);

  const when = $derived(
    !app.lastBackupAt
      ? 'Noch keine Sicherung erfasst'
      : age === 0
        ? `Zuletzt heute, ${app.lastBackupAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
        : age === 1
          ? 'Zuletzt gestern'
          : `Zuletzt vor ${age} Tagen`,
  );

  async function backup() {
    busy = true;
    try {
      if (folder) {
        if (await app.runFolderBackupNow()) toast.success('Sicherung in den Ordner geschrieben.');
      } else {
        await app.downloadBackup();
        toast.success('Verschlüsselte Sicherung exportiert.');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      busy = false;
    }
  }
</script>

<Widget id="datensicherung" title="Datensicherung" badge={warn ? '!' : null}>
  <div
    class="card flex items-center gap-3 p-4 {warn ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/[0.06]' : ''}"
  >
    <span
      class="grid h-9 w-9 shrink-0 place-items-center rounded-xl {warn
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}"
    >
      <Icon name={warn ? 'alert' : 'shield'} size={17} />
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{when}</div>
      <div class="truncate text-[0.71875rem] text-slate-500">
        {#if folder}
          Automatisch in „{folder}“{app.folderBackup.ok ? '' : ' · Berechtigung nötig'}
        {:else}
          Kein Sicherungsordner · <a class="underline decoration-slate-300 underline-offset-2 hover:text-brand-600" href={href.settings()}>einrichten</a>
        {/if}
      </div>
    </div>
    <button class="btn {warn ? 'btn-primary' : 'btn-soft'} h-8 px-3 text-[0.75rem]" disabled={busy} onclick={backup}>
      <Icon name={folder ? 'folder' : 'download'} size={14} /> Jetzt sichern
    </button>
  </div>
</Widget>
