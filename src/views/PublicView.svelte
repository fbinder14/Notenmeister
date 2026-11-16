<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { entriesFor, formatAvg, summarize, type Ctx } from '../lib/domain/grading';
  import { findClass, fmtDate, sortStudents, studentGradeRows, subjectOf, yearOf } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { Student } from '../lib/domain/types';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Modal from '../ui/Modal.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import { SUBJECT_DOT } from '../ui/colors';

  /**
   * Öffentlicher Modus: zeigt nur Klassen- und Schülernamen. Noten einer Person
   * erscheinen erst nach ausdrücklicher Rückfrage und verschwinden von selbst wieder.
   */
  let { classId = null }: { classId?: string | null } = $props();

  const REVEAL_SECONDS = 60;

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const cls = $derived(classId ? findClass(classId) : undefined);
  const students = $derived(cls ? sortStudents(cls.students.filter((s) => !s.leftAt)) : []);

  let ask = $state<Student | null>(null);
  let shown = $state<Student | null>(null);
  let left = $state(REVEAL_SECONDS);
  let timer: ReturnType<typeof setInterval> | null = null;

  function reveal() {
    shown = ask;
    ask = null;
    left = REVEAL_SECONDS;
    stop();
    timer = setInterval(() => {
      left--;
      if (left <= 0) hide();
    }, 1000);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function hide() {
    stop();
    shown = null;
  }
  $effect(() => stop);

  // Verlässt jemand den öffentlichen Modus oder die Klasse, bleibt nichts offen.
  $effect(() => {
    void classId;
    return () => hide();
  });

  const ctx = $derived<Ctx | null>(cls && yearOf(cls) ? { types: new Map(app.core.types.map((t) => [t.id, t])), year: yearOf(cls)! } : null);
  const courses = $derived(cls && shown ? cls.courses.filter((c) => !c.excludedStudentIds.includes(shown!.id)) : []);
</script>

<header class="glass sticky top-0 z-20 border-b px-8 py-4">
  <div class="flex items-center gap-3">
    {#if cls}
      <a href={href.dashboard()} class="btn btn-ghost h-8 w-8 px-0" aria-label="Zurück"><Icon name="back" size={16} /></a>
    {/if}
    <div>
      <div class="text-[0.75rem] font-medium text-amber-700 dark:text-amber-300">Öffentlicher Modus · Noten ausgeblendet</div>
      <h1 class="text-[1.25rem] font-semibold tracking-tight text-slate-900 dark:text-white">{cls ? `Klasse ${cls.name}` : 'Klassen'}</h1>
    </div>
  </div>
</header>

<div class="mx-auto max-w-5xl px-8 py-7">
  {#if !cls}
    {#if classes.length}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each classes as c (c.id)}
          <a href={href.cls(c.id)} class="card flex items-center gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon name="users" size={18} /></span>
            <span class="text-[1.0625rem] font-semibold">Klasse {c.name}</span>
          </a>
        {/each}
      </div>
    {:else}
      <Empty icon="users" title="Keine Klassen" />
    {/if}
  {:else if students.length}
    <p class="mb-4 text-[0.8125rem] text-slate-500">Auf einen Namen klicken, um nach Rückfrage die Noten dieser Person kurz einzublenden.</p>
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {#each students as s (s.id)}
        <button class="card flex items-center justify-between px-4 py-3 text-left transition hover:shadow-lift" onclick={() => (ask = s)}>
          <span class="font-medium">{s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span></span>
          <Icon name="eye" size={15} class="text-slate-300" />
        </button>
      {/each}
    </div>
  {:else}
    <Empty icon="users" title="Noch niemand in der Klasse" />
  {/if}
</div>

<Modal open={!!ask} title="Noten anzeigen?" width="max-w-md" onclose={() => (ask = null)}>
  {#if ask}
    <p class="text-[0.875rem] leading-relaxed">
      Die Noten von <b>{ask.firstName} {ask.lastName}</b> werden für {REVEAL_SECONDS} Sekunden angezeigt.
    </p>
    <p class="mt-2 flex items-start gap-2 text-[0.78125rem] text-amber-700 dark:text-amber-300">
      <Icon name="alert" size={14} class="mt-0.5 shrink-0" /> Vorher prüfen: Ist der Beamer aus und schaut niemand sonst mit?
    </p>
  {/if}
  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => (ask = null)}>Abbrechen</button>
    <button class="btn btn-primary" onclick={reveal}><Icon name="eye" size={15} /> Ja, anzeigen</button>
  {/snippet}
</Modal>

<Modal open={!!shown} title={shown ? `${shown.firstName} ${shown.lastName}` : ''} subtitle="Wird in {left} s ausgeblendet" width="max-w-2xl" onclose={hide}>
  {#if shown && ctx}
    <div class="grid gap-4">
      {#each courses as c (c.id)}
        {@const subj = subjectOf(c)}
        {@const rows = studentGradeRows(c, shown.id)}
        {@const all = summarize(entriesFor(c, shown.id, ctx, 'jahr'))}
        <section class="rounded-xl border border-slate-200 dark:border-line-dark">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-line-dark">
            <span class="flex items-center gap-2 text-[0.875rem] font-semibold"><span class="h-2 w-2 rounded-full {SUBJECT_DOT[subj?.color ?? 'slate']}"></span>{subj?.name}</span>
            <span class="text-[0.75rem] text-slate-500">Schnitt <b class="tabular-nums text-slate-800 dark:text-slate-100">{formatAvg(all.total)}</b></span>
          </div>
          {#if rows.length}
            <table class="w-full text-[0.8125rem]">
              <tbody>
                {#each rows as row (row.g.id)}
                  <tr class="border-t border-slate-100 first:border-t-0 dark:border-line-dark">
                    <td class="w-24 px-4 py-1.5 tabular-nums text-slate-500">{fmtDate(row.date)}</td>
                    <td class="px-2 py-1.5">{row.name}</td>
                    <td class="w-14 px-4 py-1.5 text-center"><GradeBadge value={row.g.value} status={row.g.status} size="sm" /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="px-4 py-3 text-[0.8125rem] text-slate-400">Noch keine Noten.</p>
          {/if}
        </section>
      {:else}
        <p class="text-[0.8125rem] text-slate-500">Keine Unterrichte.</p>
      {/each}
    </div>
  {/if}
  {#snippet footer()}
    <button class="btn btn-primary" onclick={hide}><Icon name="eyeOff" size={15} /> Ausblenden</button>
  {/snippet}
</Modal>
