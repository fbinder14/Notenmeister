<script lang="ts">
  import { missingGrades, missingOf, type GradeSlots } from '../../lib/domain/dashboard';
  import type { Ctx } from '../../lib/domain/grading';
  import { fmtDate, subjectOf } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import { SUBJECT_DOT } from '../colors';
  import Donut from '../Donut.svelte';
  import Icon from '../Icon.svelte';
  import Widget from '../Widget.svelte';

  /**
   * Tage bis zum nächsten Zeugnis und grafischer Überblick, wie viele Noten bis
   * dahin noch fehlen – getrennt nach großen und kleinen Leistungsnachweisen.
   * Nur Zahlen je Kurs, keine Namen.
   */
  let { classes, ctx, today }: { classes: SchoolClass[]; ctx: Ctx; today: string } = $props();

  const PAGE = 5;
  let more = $state(false);

  const r = $derived(missingGrades(classes, ctx, today));
  const ready = $derived(r ? r.courses.filter((c) => c.complete === c.total).length : 0);
  const urgent = $derived(r ? r.daysLeft <= 21 : false);
  const missing = $derived(r ? missingOf(r.gross) + missingOf(r.klein) : 0);

  const KINDS: Array<{ key: keyof GradeSlots; label: string; stroke: string; dot: string }> = [
    { key: 'erfasst', label: 'erfasst', stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
    { key: 'offen', label: 'nicht eingetragen', stroke: 'stroke-amber-500', dot: 'bg-amber-500' },
    { key: 'nachtermin', label: 'Nachtermin/Ersatz offen', stroke: 'stroke-rose-500', dot: 'bg-rose-500' },
    { key: 'ausstehend', label: 'noch zu erheben', stroke: 'stroke-slate-300 dark:stroke-slate-500', dot: 'bg-slate-300 dark:bg-slate-500' },
  ];

  const segments = (s: GradeSlots) => KINDS.map((k) => ({ value: s[k.key], class: k.stroke }));
  const describe = (name: string, s: GradeSlots) =>
    `${name}: ${s.erfasst} erfasst, ${s.offen} nicht eingetragen, ${s.nachtermin} Nachtermin oder Ersatz offen, ${s.ausstehend} noch zu erheben`;
</script>

{#if r && r.courses.length}
  {@const title = r.term === 'zwischen' ? 'Zwischenzeugnis' : 'Jahreszeugnis'}
  <Widget id="zeugnis" {title} badge={missing ? `${missing} fehlen` : `${r.daysLeft} T.`}>
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

      <div class="border-t border-slate-100 px-4 py-4 dark:border-line-dark">
        <div class="grid grid-cols-2 gap-3">
          {#each [{ name: 'Große LN', long: 'Große Leistungsnachweise', s: r.gross }, { name: 'Kleine LN', long: 'Kleine Leistungsnachweise', s: r.klein }] as d (d.name)}
            {@const m = missingOf(d.s)}
            <div class="flex flex-col items-center gap-2">
              <Donut segments={segments(d.s)} label={describe(d.long, d.s)}>
                {#if m}
                  <div>
                    <div class="text-[1.375rem] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">{m}</div>
                    <div class="mt-0.5 text-[0.625rem] uppercase tracking-wide text-slate-400">fehlen</div>
                  </div>
                {:else}
                  <span class="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Icon name="check" size={18} stroke={2.25} /></span>
                {/if}
              </Donut>
              <div class="text-center">
                <div class="text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{d.name}</div>
                <div class="text-[0.6875rem] tabular-nums text-slate-500">{d.s.erfasst} von {d.s.erfasst + m} erfasst</div>
              </div>
            </div>
          {/each}
        </div>

        <table class="mt-4 w-full text-[0.75rem]">
          <thead>
            <tr class="text-[0.6875rem] uppercase tracking-wide text-slate-400">
              <th class="pb-1 text-left font-medium">Noten</th>
              <th class="w-14 pb-1 text-right font-medium">groß</th>
              <th class="w-14 pb-1 text-right font-medium">klein</th>
            </tr>
          </thead>
          <tbody>
            {#each KINDS as k (k.key)}
              <tr class="text-slate-600 dark:text-slate-300">
                <td class="py-0.5"><span class="mr-2 inline-block h-2 w-2 rounded-full {k.dot}"></span>{k.label}</td>
                <td class="py-0.5 text-right tabular-nums {r.gross[k.key] ? '' : 'text-slate-300 dark:text-slate-600'}">{r.gross[k.key]}</td>
                <td class="py-0.5 text-right tabular-nums {r.klein[k.key] ? '' : 'text-slate-300 dark:text-slate-600'}">{r.klein[k.key]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="divide-y divide-slate-100 border-t border-slate-100 dark:divide-line-dark dark:border-line-dark">
        {#each r.courses.slice(0, more ? r.courses.length : PAGE) as { cls, course, gross, klein, complete, total } (course.id)}
          {@const s = subjectOf(course)}
          {@const g = missingOf(gross)}
          {@const k = missingOf(klein)}
          <a href={href.report(cls.id, course.id)} class="flex items-center gap-2 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
            <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{cls.name} · {s?.name}</span>
            {#if g || k}
              <span class="text-[0.71875rem] tabular-nums text-slate-500" title="Fehlende Noten bei großen und kleinen Leistungsnachweisen">
                {#if g}<b class="font-semibold text-slate-700 dark:text-slate-200">{g}</b> groß{/if}{#if g && k} · {/if}{#if k}<b class="font-semibold text-slate-700 dark:text-slate-200">{k}</b> klein{/if}
              </span>
            {:else}
              <span class="text-[0.71875rem] font-medium text-emerald-600 dark:text-emerald-400">vollständig</span>
            {/if}
            <span class="w-12 text-right text-[0.6875rem] tabular-nums text-slate-400" title="Schülerinnen und Schüler mit allen nötigen Noten">{complete}/{total}</span>
          </a>
        {/each}
        {#if r.courses.length > PAGE}
          <div class="px-4 py-2">
            <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={() => (more = !more)}>{more ? 'Weniger' : `Alle Kurse anzeigen (${r.courses.length})`}</button>
          </div>
        {/if}
      </div>
    </div>
  </Widget>
{/if}
