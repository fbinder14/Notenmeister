<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { todayIso } from '../../lib/state/actions';
  import { reportDay } from '../../lib/domain/calendar';
  import type { OnboardingStep } from '../../lib/domain/types';
  import Icon from '../../ui/Icon.svelte';
  import YearTimeline from '../../ui/YearTimeline.svelte';
  import { SUBJECT_DOT } from '../../ui/colors';

  /** Rechte Spalte: was bisher eingerichtet ist, live aus den echten Daten. */
  let { step }: { step: OnboardingStep } = $props();

  const year = $derived(app.activeYear);
  const subjects = $derived(app.core.subjects);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const students = $derived(classes.filter((c) => !c.demo).reduce((n, c) => n + c.students.length, 0));
  const courses = $derived(classes.filter((c) => !c.demo).reduce((n, c) => n + c.courses.length, 0));
  const subjectOf = (id: string) => subjects.find((s) => s.id === id);
  const today = todayIso();
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

  const focus = (s: OnboardingStep[]) => (s.includes(step) ? 'ring-2 ring-brand-300/70 dark:ring-brand-500/40' : '');
</script>

<div class="card overflow-hidden shadow-lift">
  <div class="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-brand-500/10 via-violet-500/5 to-transparent px-5 py-3.5 dark:border-line-dark">
    <div class="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Icon name="book" size={14} /></div>
    <div class="leading-tight">
      <div class="text-[0.8125rem] font-semibold text-slate-900 dark:text-white">Dein Notenmeister</div>
      <div class="text-[0.6875rem] text-slate-500">Vorschau – füllt sich mit jedem Schritt</div>
    </div>
  </div>

  <div class="grid gap-3 p-4">
    <!-- Fächer -->
    <section class="rounded-xl p-3 transition {focus(['faecher'])}">
      <h3 class="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Fächer</h3>
      {#if subjects.length}
        <div class="flex flex-wrap gap-1.5">
          {#each subjects as s (s.id)}
            <span class="inline-flex animate-pop items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-medium dark:bg-white/5" title={s.name}>
              <span class="h-2 w-2 rounded-full {SUBJECT_DOT[s.color] ?? 'bg-slate-400'}"></span>{s.short}
            </span>
          {/each}
        </div>
      {:else}
        <div class="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[0.75rem] text-slate-400 dark:border-line-dark">Noch keine Fächer gewählt</div>
      {/if}
    </section>

    <!-- Schuljahr -->
    {#if year}
      <section class="rounded-xl p-3 transition {focus(['schuljahr'])}">
        <h3 class="mb-2 flex items-baseline justify-between text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
          Schuljahr {year.name}
          <span class="font-normal normal-case tracking-normal">{year.holidays?.length ? `${year.holidays.length} Ferienzeiträume` : ''}</span>
        </h3>
        <YearTimeline {year} {today} />
        <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-slate-500">
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-brand-500"></span>Zwischenzeugnis {fmt(reportDay(year, 'zwischen'))}</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-violet-500"></span>Jahreszeugnis {fmt(year.end)}</span>
        </div>
      </section>
    {/if}

    <!-- Klassen -->
    <section class="rounded-xl p-3 transition {focus(['klassen', 'unterricht'])}">
      <h3 class="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Klassen</h3>
      {#if classes.length}
        <div class="grid gap-2">
          {#each classes as c (c.id)}
            <div class="animate-fade-up rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 dark:border-line-dark dark:bg-white/[0.03]">
              <div class="flex items-center gap-2">
                <span class="text-[0.875rem] font-semibold text-slate-900 dark:text-white">{c.name}</span>
                {#if c.demo}<span class="rounded-full bg-amber-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Beispiel</span>{/if}
                <span class="ml-auto flex items-center gap-1 text-[0.6875rem] tabular-nums text-slate-500"><Icon name="users" size={12} />{c.students.length}</span>
              </div>
              {#if c.courses.length}
                <div class="mt-1.5 flex flex-wrap gap-1">
                  {#each c.courses as k (k.id)}
                    {@const s = subjectOf(k.subjectId)}
                    <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] dark:bg-white/5">
                      <span class="h-1.5 w-1.5 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>{s?.short ?? '?'}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[0.75rem] text-slate-400 dark:border-line-dark">Noch keine Klassen</div>
      {/if}
    </section>
  </div>

  <div class="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 text-center dark:divide-line-dark dark:border-line-dark">
    {#each [{ n: classes.filter((c) => !c.demo).length, l: 'Klassen' }, { n: students, l: 'Schüler' }, { n: courses, l: 'Unterrichte' }] as k (k.l)}
      <div class="py-2.5">
        <div class="text-[1.0625rem] font-semibold tabular-nums text-slate-900 dark:text-white">{k.n}</div>
        <div class="text-[0.625rem] uppercase tracking-wide text-slate-400">{k.l}</div>
      </div>
    {/each}
  </div>
</div>
