<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { entriesFor, formatAvg, summarize, type Ctx } from '../lib/domain/grading';
  import { courseStudents, findClass, findCourse, fmtDate, fmtShortDate, sortedAssessments, sportDetail, STATUS_SHORT, subjectOf, typeById, yearOf } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { Period } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { classId, courseId }: { classId: string; courseId: string } = $props();
  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const year = $derived(cls ? yearOf(cls) : undefined);
  const ctx = $derived<Ctx | null>(year ? { types: new Map(app.core.types.map((t) => [t.id, t])), year } : null);
  const students = $derived(cls && course ? courseStudents(cls, course) : []);
  const assessments = $derived(course ? sortedAssessments(course) : []);

  let what = $state<'uebersicht' | 'boegen'>('uebersicht');
  let period = $state<Period>('jahr');

  const cell = (aId: string, sId: string) => {
    const g = course!.grades.find((x) => x.assessmentId === aId && x.studentId === sId);
    if (!g) return '';
    if (g.status === 'nachtermin') return 'NT';
    return `${g.value ?? ''}${STATUS_SHORT[g.status] ? ` ${STATUS_SHORT[g.status]}` : ''}`;
  };
  const singles = (sId: string) =>
    course!.grades
      .filter((g) => !g.assessmentId && g.studentId === sId)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  const rep = (sId: string, t: 'zwischen' | 'jahr') => course!.reportGrades.find((r) => r.studentId === sId && r.term === t)?.value ?? '';
</script>

{#if !cls || !course || !ctx}
  <div class="p-8"><Empty icon="print" title="Unterricht nicht gefunden" /></div>
{:else}
  <PageHeader title="Drucken" eyebrow="{cls.name} · {subjectOf(course)?.name}" back={href.course(cls.id, course.id)}>
    {#snippet actions()}
      <button class="btn btn-primary" onclick={() => print()}><Icon name="print" size={15} /> Drucken / Als PDF sichern</button>
    {/snippet}
    <div class="flex flex-wrap items-center gap-3">
      <Segmented bind:value={what} options={[{ value: 'uebersicht', label: 'Klassenübersicht' }, { value: 'boegen', label: 'Notenbögen je Schüler' }]} />
      {#if what === 'boegen'}
        <Segmented bind:value={period} options={[{ value: 1, label: '1. Hj.' }, { value: 'jahr', label: 'Schuljahr' }]} />
      {/if}
      <span class="flex items-center gap-1.5 text-[0.75rem] text-amber-700 dark:text-amber-300"><Icon name="alert" size={14} /> Ausdrucke und PDF-Dateien sind nicht verschlüsselt.</span>
    </div>
  </PageHeader>

  <div class="mx-auto max-w-[1100px] px-8 py-7">
    <div class="rounded-xl bg-white p-8 text-[0.75rem] text-black shadow-lift print:p-0 print:shadow-none">
      {#if what === 'uebersicht'}
        <h1 class="text-[1rem] font-bold">{subjectOf(course)?.name} · Klasse {cls.name}</h1>
        <p class="mb-4 text-[0.6875rem] text-slate-600">Schuljahr {year?.name} · Stand {new Date().toLocaleString('de-DE')}</p>
        <table class="w-full border-collapse text-[0.6875rem]">
          <thead>
            <tr>
              <th class="border border-slate-300 px-1.5 py-1 text-left">Name</th>
              {#each assessments as a (a.id)}
                <th class="border border-slate-300 px-1 py-1 text-center font-semibold">{typeById(a.typeId)?.short}<br /><span class="font-normal">{fmtShortDate(a.date)}</span></th>
              {/each}
              <th class="border border-slate-300 px-1.5 py-1 text-left">Einzelnoten</th>
              <th class="border border-slate-300 px-1 py-1">Ø 1. Hj.</th>
              <th class="border border-slate-300 px-1 py-1">Ø Jahr</th>
              <th class="border border-slate-300 px-1 py-1">ZZ</th>
              <th class="border border-slate-300 px-1 py-1">JZ</th>
            </tr>
          </thead>
          <tbody>
            {#each students as s (s.id)}
              <tr class="even:bg-slate-50">
                <td class="whitespace-nowrap border border-slate-300 px-1.5 py-0.5">{s.lastName}, {s.firstName}</td>
                {#each assessments as a (a.id)}<td class="border border-slate-300 px-1 py-0.5 text-center tabular-nums">{cell(a.id, s.id)}</td>{/each}
                <td class="border border-slate-300 px-1.5 py-0.5 tabular-nums">{singles(s.id).map((g) => (g.status === 'nachtermin' ? 'NT' : g.value)).join('  ')}</td>
                <td class="border border-slate-300 px-1 py-0.5 text-center tabular-nums">{formatAvg(summarize(entriesFor(course, s.id, ctx, 1)).total)}</td>
                <td class="border border-slate-300 px-1 py-0.5 text-center font-semibold tabular-nums">{formatAvg(summarize(entriesFor(course, s.id, ctx, 'jahr')).total)}</td>
                <td class="border border-slate-300 px-1 py-0.5 text-center font-semibold">{rep(s.id, 'zwischen')}</td>
                <td class="border border-slate-300 px-1 py-0.5 text-center font-semibold">{rep(s.id, 'jahr')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="mt-3 text-[0.625rem] text-slate-500">
          {assessments.map((a) => `${typeById(a.typeId)?.short} ${fmtShortDate(a.date)}: ${a.title}`).join(' · ')}
        </p>
        <p class="mt-1 text-[0.625rem] text-slate-500">NT = Nachtermin offen · v = unentschuldigt versäumt · vw = verweigert · U = Unterschleif · – = nicht gewertet</p>
      {:else}
        {#each students as s, i (s.id)}
          {@const sum = summarize(entriesFor(course, s.id, ctx, period))}
          {@const items = entriesFor(course, s.id, ctx, period).sort((a, b) => a.grade.performedAt.localeCompare(b.grade.performedAt))}
          <section class={i < students.length - 1 ? 'print-break mb-10 border-b border-dashed border-slate-300 pb-10 print:mb-0 print:border-0 print:pb-0' : ''}>
            <h1 class="text-[0.9375rem] font-bold">Notenbogen {subjectOf(course)?.name}</h1>
            <p class="mb-3 text-[0.75rem]">{s.lastName}, {s.firstName} · Klasse {cls.name} · {period === 1 ? '1. Halbjahr' : 'Schuljahr'} {year?.name}</p>
            <table class="w-full border-collapse text-[0.71875rem]">
              <thead>
                <tr class="bg-slate-100">
                  <th class="border border-slate-300 px-2 py-1 text-left">Datum</th>
                  <th class="border border-slate-300 px-2 py-1 text-left">Leistungsnachweis</th>
                  <th class="border border-slate-300 px-2 py-1">Gewicht</th>
                  <th class="border border-slate-300 px-2 py-1">Note</th>
                  <th class="border border-slate-300 px-2 py-1 text-left">Bemerkung</th>
                </tr>
              </thead>
              <tbody>
                {#each items as e (e.grade.id)}
                  <tr>
                    <td class="border border-slate-300 px-2 py-0.5">{fmtDate(e.assessment ? e.assessment.date : e.grade.performedAt)}</td>
                    <td class="border border-slate-300 px-2 py-0.5">{e.assessment ? e.assessment.title : `${e.type?.name ?? ''}${e.grade.title ? ` · ${e.grade.title}` : ''}`}</td>
                    <td class="border border-slate-300 px-2 py-0.5 text-center">{e.weight}</td>
                    <td class="border border-slate-300 px-2 py-0.5 text-center font-semibold">{e.value}{STATUS_SHORT[e.grade.status] ? ` ${STATUS_SHORT[e.grade.status]}` : ''}</td>
                    <td class="border border-slate-300 px-2 py-0.5">{[sportDetail(e.grade, e.assessment), e.grade.comment].filter(Boolean).join(' · ')}</td>
                  </tr>
                {:else}
                  <tr><td colspan="5" class="border border-slate-300 px-2 py-2 text-slate-500">Keine Noten.</td></tr>
                {/each}
              </tbody>
            </table>
            <p class="mt-2 text-[0.75rem]">
              Schnitt: <b>{formatAvg(sum.total)}</b>
              {#if rep(s.id, period === 1 ? 'zwischen' : 'jahr')} · Zeugnisnote: <b>{rep(s.id, period === 1 ? 'zwischen' : 'jahr')}</b>{/if}
            </p>
            <div class="mt-10 grid grid-cols-2 gap-10 text-[0.65625rem] text-slate-600">
              <div class="border-t border-slate-400 pt-1">Datum, Unterschrift Lehrkraft</div>
              <div class="border-t border-slate-400 pt-1">Kenntnisnahme Erziehungsberechtigte</div>
            </div>
          </section>
        {/each}
      {/if}
    </div>
  </div>
{/if}
