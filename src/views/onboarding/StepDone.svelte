<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { fmtDate, todayIso } from '../../lib/state/actions';
  import { deadlineFor, reportDay } from '../../lib/domain/calendar';
  import { daysBetween } from '../../lib/domain/dashboard';
  import { go, href } from '../../lib/state/router.svelte';
  import Icon from '../../ui/Icon.svelte';

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id && !c.demo));
  const students = $derived(classes.reduce((n, c) => n + c.students.length, 0));
  const courses = $derived(classes.flatMap((c) => c.courses.map((k) => ({ c, k }))));
  const backup = $derived(!!app.folderBackup.name || !!app.lastBackupAt);
  const today = todayIso();

  const next = $derived.by(() => {
    if (!year || today > year.end) return null;
    const term = today < year.halfSwitch ? 'zwischen' : 'jahr';
    const deadline = deadlineFor(year, term);
    const report = reportDay(year, term);
    const useDeadline = deadline !== report && today <= deadline;
    const date = useDeadline ? deadline : report;
    return { name: `${useDeadline ? 'Notenschluss' : ''}${useDeadline ? ' fürs ' : ''}${term === 'zwischen' ? 'Zwischenzeugnis' : 'Jahreszeugnis'}`, date, days: daysBetween(today, date) };
  });

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Strg+';

  function finish(target = href.dashboard()) {
    app.finishOnboarding();
    go(target);
  }
</script>

<div class="grid gap-6">
  <div class="flex flex-col items-center gap-3 pt-2 text-center">
    <div class="grid h-16 w-16 animate-pop place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_12px_30px_-8px_rgb(16_185_129/0.6)]">
      <Icon name="check" size={30} stroke={2.5} />
    </div>
    <div>
      <h3 class="text-[1.25rem] font-semibold text-slate-900 dark:text-white">Alles bereit!</h3>
      <p class="mt-1 text-[0.8125rem] text-slate-500">Dein Notenmeister ist eingerichtet. Ab jetzt sind es nur noch Noten eintragen.</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#each [{ n: app.core.subjects.length, l: app.core.subjects.length === 1 ? 'Fach' : 'Fächer', i: 'book' }, { n: classes.length, l: classes.length === 1 ? 'Klasse' : 'Klassen', i: 'users' }, { n: students, l: 'Schüler', i: 'users' }, { n: courses.length, l: courses.length === 1 ? 'Unterricht' : 'Unterrichte', i: 'list' }] as k, i (k.l)}
      <div class="animate-fade-up rounded-xl border border-slate-200 bg-white/70 px-3 py-3 text-center dark:border-line-dark dark:bg-white/[0.03]" style="animation-delay: {i * 60}ms">
        <div class="text-[1.375rem] font-semibold tabular-nums text-slate-900 dark:text-white">{k.n}</div>
        <div class="text-[0.6875rem] uppercase tracking-wide text-slate-400">{k.l}</div>
      </div>
    {/each}
  </div>

  <div class="grid gap-2">
    {#if next}
      <div class="flex items-center gap-3 rounded-xl bg-brand-50/70 px-4 py-3 text-[0.8125rem] dark:bg-brand-500/10">
        <Icon name="calendar" size={17} class="shrink-0 text-brand-600 dark:text-brand-300" />
        <span><b>{next.name}</b> am {fmtDate(next.date)} – noch {next.days} Tag{next.days === 1 ? '' : 'e'}. Die Startseite zeigt dir, welche Noten bis dahin fehlen.</span>
      </div>
    {/if}
    {#if !backup}
      <div class="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        <Icon name="alert" size={17} class="shrink-0" />
        <span>Noch keine Sicherung eingerichtet. Das geht jederzeit über die Startseite oder die Einstellungen.</span>
      </div>
    {/if}
    <div class="flex flex-wrap gap-x-5 gap-y-1 px-1 pt-1 text-[0.75rem] text-slate-500">
      <span><span class="kbd">{mod}L</span> sperren</span>
      <span><span class="kbd">{isMac ? '⇧⌘P' : 'Strg+⇧+P'}</span> öffentlicher Modus für den Beamer</span>
      <span>Assistent erneut öffnen: Einstellungen › Unterricht</span>
    </div>
  </div>

  <div class="flex flex-wrap justify-center gap-2">
    {#if courses.length}
      <button type="button" class="btn btn-soft h-11 px-5" onclick={() => finish(href.course(courses[0].c.id, courses[0].k.id))}>
        <Icon name="calendar" size={16} /> Ersten Leistungsnachweis planen
      </button>
    {/if}
    <button type="button" class="btn btn-primary h-11 px-6" onclick={() => finish()}>Zur Startseite <Icon name="arrow" size={16} /></button>
  </div>
</div>
