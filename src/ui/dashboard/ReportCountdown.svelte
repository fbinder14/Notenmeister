<script lang="ts">
  import { reportStatus } from '../../lib/domain/dashboard';
  import type { Ctx } from '../../lib/domain/grading';
  import { fmtDate, subjectOf } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import { SUBJECT_DOT } from '../colors';

  /**
   * Tage bis zum nächsten Zeugnis und je Kurs, bei wie vielen Schülerinnen und
   * Schülern alle nötigen Noten vorliegen. Nur Zahlen, keine Namen.
   */
  let { classes, ctx, today }: { classes: SchoolClass[]; ctx: Ctx; today: string } = $props();

  const r = $derived(reportStatus(classes, ctx, today));
  const ready = $derived(r ? r.courses.filter((c) => c.complete === c.total).length : 0);
  const urgent = $derived(r ? r.daysLeft <= 21 : false);
</script>

{#if r && r.courses.length}
  <section>
    <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">{r.term === 'zwischen' ? 'Zwischenzeugnis' : 'Jahreszeugnis'}</h2>
    <div class="card overflow-hidden">
      <div class="flex items-center gap-4 px-4 py-4">
        <div
          class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-center {urgent
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft'
            : 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft'}"
        >
          <div>
            <div class="text-[1.25rem] font-semibold leading-none tabular-nums">{r.daysLeft}</div>
            <div class="mt-0.5 text-[0.625rem] uppercase tracking-wide opacity-90">{r.daysLeft === 1 ? 'Tag' : 'Tage'}</div>
          </div>
        </div>
        <div class="min-w-0">
          <div class="text-[0.875rem] font-semibold text-slate-900 dark:text-white">bis {r.term === 'zwischen' ? 'zum Halbjahreswechsel' : 'zum Schuljahresende'} am {fmtDate(r.date)}</div>
          <div class="text-[0.75rem] text-slate-500">
            {ready} von {r.courses.length} Kurs{r.courses.length === 1 ? '' : 'en'} vollständig · Notenschluss rechtzeitig vorher einplanen
          </div>
        </div>
      </div>
      <div class="divide-y divide-slate-100 border-t border-slate-100 dark:divide-line-dark dark:border-line-dark">
        {#each r.courses as { cls, course, complete, total, missing } (course.id)}
          {@const s = subjectOf(course)}
          {@const share = complete / total}
          <a href={href.report(cls.id, course.id)} class="block px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
              <span class="flex-1 truncate text-[0.8125rem] font-medium">{cls.name} · {s?.name}</span>
              <span class="text-[0.75rem] tabular-nums text-slate-500">{complete}/{total}</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                class="h-full rounded-full {share === 1 ? 'bg-emerald-500' : share >= 0.6 ? 'bg-sky-500' : 'bg-amber-500'}"
                style="width: {Math.max(share * 100, 2)}%"
              ></div>
            </div>
            {#if missing.length}<div class="mt-1 truncate text-[0.6875rem] text-slate-400">{missing.join(' · ')}</div>{/if}
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
