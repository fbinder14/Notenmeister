<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../lib/state/app.svelte';
  import { entriesFor, formatAvg, gradeDate, halfOf, summarize, suggestGrade, type Ctx } from '../lib/domain/grading';
  import { courseStudents, findClass, findCourse, setReportGrade, subjectOf, yearOf } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { GradeValue, ReportTerm } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Distribution from '../ui/Distribution.svelte';
  import { GRADE_CLASS } from '../ui/colors';

  let { classId, courseId }: { classId: string; courseId: string } = $props();
  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const year = $derived(cls ? yearOf(cls) : undefined);
  const students = $derived(cls && course ? courseStudents(cls, course) : []);
  const ctx = $derived<Ctx | null>(year ? { types: new Map(app.core.types.map((t) => [t.id, t])), year } : null);

  let term = $state<ReportTerm>(untrack(() => (year && new Date().toISOString().slice(0, 10) >= year.halfSwitch ? 'jahr' : 'zwischen')));
  const period = $derived(term === 'zwischen' ? 1 : 'jahr');

  const rows = $derived(
    course && ctx
      ? students.map((s) => {
          const sum = summarize(entriesFor(course, s.id, ctx, period));
          const set = course.reportGrades.find((r) => r.studentId === s.id && r.term === term);
          // Sport: Nachweise mit Befreiung (Attest) im Zeitraum.
          const exempt = course.grades.filter(
            (g) => g.studentId === s.id && g.status === 'befreit' && (period === 'jahr' || halfOf(gradeDate(g, course.assessments.find((a) => a.id === g.assessmentId)), ctx.year) === period),
          ).length;
          return { s, sum, suggestion: suggestGrade(sum.total, app.core.settings.rounding), set, exempt };
        })
      : [],
  );
  const values = $derived(rows.filter((r) => r.set).map((r) => r.set!.value));
  const open = $derived(rows.filter((r) => !r.set && !r.s.leftAt).length);

  function setGrade(studentId: string, v: GradeValue | null) {
    setReportGrade(cls!, course!, studentId, term, v);
  }

  function takeAll() {
    let n = 0;
    for (const r of rows) {
      if (!r.set && r.suggestion && !r.s.leftAt) {
        setGrade(r.s.id, r.suggestion);
        n++;
      }
    }
    toast.success(`${n} Vorschläge übernommen. Bitte jede Note prüfen.`);
  }
</script>

{#if !cls || !course || !ctx}
  <div class="p-8"><Empty icon="award" title="Unterricht nicht gefunden" /></div>
{:else}
  <PageHeader title="Zeugnisnoten" eyebrow="{cls.name} · {subjectOf(course)?.name}" back={href.course(cls.id, course.id)}>
    {#snippet actions()}
      <button class="btn btn-soft" onclick={takeAll} disabled={!open}><Icon name="sparkles" size={15} /> Offene Vorschläge übernehmen</button>
    {/snippet}
    <Segmented bind:value={term} options={[{ value: 'zwischen', label: 'Zwischenzeugnis (1. Hj.)' }, { value: 'jahr', label: 'Jahreszeugnis' }]} />
  </PageHeader>

  <div class="mx-auto grid max-w-6xl gap-6 px-8 py-7 lg:grid-cols-[1fr_18rem]">
    <section class="card overflow-hidden">
      <table class="w-full text-[0.8125rem]">
        <thead class="bg-slate-50/80 text-left text-[0.6875rem] uppercase tracking-wider text-slate-400 dark:bg-white/[0.02]">
          <tr>
            <th class="px-5 py-2.5 font-semibold">Name</th>
            <th class="px-2 py-2.5 text-center font-semibold">Ø gesamt</th>
            <th class="px-2 py-2.5 text-center font-semibold">Vorschlag</th>
            <th class="px-5 py-2.5 font-semibold">Zeugnisnote</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.s.id)}
            <tr class="border-t border-slate-100 dark:border-line-dark {r.s.leftAt ? 'opacity-50' : ''}">
              <td class="px-5 py-2 font-medium">
                {r.s.lastName}, <span class="font-normal text-slate-500">{r.s.firstName}</span>
                {#if r.exempt}
                  <div class="text-[0.6875rem] font-normal {r.sum.total === null ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500'}">
                    {r.sum.total === null ? 'Befreit: Bemerkung statt Note (RSO § 31 Abs. 6)' : `${r.exempt}× befreit – reichen die Leistungsnachweise für eine Note?`}
                  </div>
                {/if}
              </td>
              <td class="px-2 py-2 text-center font-semibold tabular-nums">{formatAvg(r.sum.total)}</td>
              <td class="px-2 py-2 text-center">
                {#if r.suggestion}<span class="inline-grid h-6 w-6 place-items-center rounded-md text-[0.75rem] font-bold ring-1 ring-inset {GRADE_CLASS[r.suggestion]}">{r.suggestion}</span>{/if}
              </td>
              <td class="px-5 py-1.5">
                <div class="flex gap-1">
                  {#each [1, 2, 3, 4, 5, 6] as v (v)}
                    <button
                      class="h-7 w-7 rounded-md text-[0.78125rem] font-semibold ring-1 ring-inset transition active:scale-90 {r.set?.value === v
                        ? `${GRADE_CLASS[v]} shadow-soft`
                        : 'text-slate-400 ring-slate-200 hover:text-slate-700 dark:ring-line-dark dark:hover:text-slate-200'}"
                      onclick={() => setGrade(r.s.id, r.set?.value === v ? null : (v as GradeValue))}
                      title={r.set?.value === v ? `Gesetzt am ${new Date(r.set.setAt).toLocaleString('de-DE')} – erneut klicken zum Entfernen` : ''}>{v}</button
                    >
                  {/each}
                  {#if r.set && r.suggestion && r.set.value !== r.suggestion}
                    <span class="ml-1 self-center text-[0.6875rem] text-amber-600" title="Weicht vom rechnerischen Vorschlag ab">≠</span>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <aside class="grid content-start gap-6">
      <div class="card p-5">
        <h2 class="mb-4 text-[0.875rem] font-semibold">Verteilung der Zeugnisnoten</h2>
        <Distribution {values} />
      </div>
      <div class="rounded-card bg-brand-50/70 p-4 text-[0.78125rem] leading-relaxed text-brand-900 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-100 dark:ring-brand-500/20">
        Der Vorschlag ist der gewichtete Schnitt nach RSO § 23 ({app.core.settings.rounding === 'streng' ? 'x,50 ergibt die schlechtere Note' : 'x,50 ergibt die bessere Note'}). Die Zeugnisnote setzt die Lehrkraft in pädagogischer Verantwortung (Art. 52 Abs. 3 BayEUG).
      </div>
    </aside>
  </div>
{/if}
