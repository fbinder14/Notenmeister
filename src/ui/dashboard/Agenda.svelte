<script lang="ts">
  import { daysBetween, pendingGrading, relativeDays } from '../../lib/domain/dashboard';
  import { fmtShortDate, subjectOf, typeById } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';
  import { SUBJECT_DOT } from '../colors';

  /**
   * „Anstehend“: Leistungsnachweise der nächsten zwei Wochen mit Countdown und
   * vergangene Nachweise, bei denen noch Noten fehlen. Enthält keine Namen.
   */
  let { classes, today }: { classes: SchoolClass[]; today: string } = $props();

  const WINDOW = 14;

  const upcoming = $derived(
    classes
      .flatMap((cls) => cls.courses.flatMap((course) => course.assessments.map((a) => ({ cls, course, a, d: daysBetween(today, a.date) }))))
      .filter((x) => x.d >= 0 && x.d <= WINDOW)
      .sort((a, b) => a.a.date.localeCompare(b.a.date)),
  );
  const pending = $derived(pendingGrading(classes, today));

  const chip = (d: number) =>
    d === 0
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
      : d <= 2
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300';
</script>

<section>
  <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Anstehend</h2>
  <div class="card divide-y divide-slate-100 dark:divide-line-dark">
    {#each upcoming as { cls, course, a, d } (a.id)}
      {@const s = subjectOf(course)}
      <a href={href.assessment(cls.id, course.id, a.id)} class="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
        <div class="w-14 text-center">
          <div class="text-[0.9375rem] font-semibold tabular-nums text-slate-900 dark:text-white">{fmtShortDate(a.date)}</div>
          <div class="text-[0.6875rem] text-slate-400">{new Date(`${a.date}T12:00`).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[0.8125rem] font-medium">{a.title}</div>
          <div class="flex items-center gap-1.5 truncate text-[0.75rem] text-slate-500">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
            {cls.name} · {s?.name} · {typeById(a.typeId)?.short}
          </div>
        </div>
        <span class="whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-medium {chip(d)}">{relativeDays(d)}</span>
      </a>
    {:else}
      <p class="px-4 py-4 text-[0.8125rem] text-slate-500">In den nächsten {WINDOW} Tagen steht nichts an.</p>
    {/each}

    {#if pending.length}
      <div class="bg-slate-50/60 px-4 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 dark:bg-white/[0.02]">Noten fehlen noch</div>
      {#each pending as { cls, course, assessment: a, entered, total, age } (a.id)}
        <a href={href.assessment(cls.id, course.id, a.id)} class="flex items-center gap-4 bg-slate-50/60 px-4 py-2.5 transition hover:bg-slate-100/70 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"><Icon name="edit" size={14} stroke={2} /></span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[0.8125rem] font-medium">{typeById(a.typeId)?.short} „{a.title}“ · {cls.name} {subjectOf(course)?.short}</div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                <div class="h-full rounded-full bg-amber-500" style="width: {(entered / total) * 100}%"></div>
              </div>
              <span class="text-[0.71875rem] tabular-nums text-slate-500">{entered} von {total} eingetragen · {relativeDays(-age)}</span>
            </div>
          </div>
          <Icon name="chevron" size={16} class="text-slate-300" />
        </a>
      {/each}
    {/if}
  </div>
</section>
