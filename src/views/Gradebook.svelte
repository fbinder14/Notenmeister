<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../lib/state/app.svelte';
  import { courseWarnings } from '../lib/domain/rules';
  import { entriesFor, formatAvg, halfOf, summarize, suggestGrade, weightedAverage, type Ctx } from '../lib/domain/grading';
  import {
    courseStudents,
    findClass,
    findCourse,
    fmtShortDate,
    gradeKeyById,
    setAssessmentGrade,
    sortedAssessments,
    subjectOf,
    todayIso,
    typeById,
    yearOf,
  } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { Assessment, Grade, Period, Student } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import GradeCell from '../ui/GradeCell.svelte';
  import WarningList from '../ui/WarningList.svelte';
  import AssessmentDialog from '../dialogs/AssessmentDialog.svelte';
  import CourseDialog from '../dialogs/CourseDialog.svelte';
  import GradeDialog from '../dialogs/GradeDialog.svelte';
  import { GRADE_CLASS } from '../ui/colors';

  let { classId, courseId }: { classId: string; courseId: string } = $props();

  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const year = $derived(cls ? yearOf(cls) : undefined);
  const subject = $derived(course ? subjectOf(course) : undefined);

  const today = todayIso();
  let period = $state<Period>(untrack(() => (year && today >= year.halfSwitch ? 2 : 1)));

  let assessOpen = $state(false);
  let courseOpen = $state(false);
  let gradeDlg = $state<{ student: Student; grade: Grade | null; a?: Assessment } | null>(null);

  const ctx = $derived<Ctx | null>(year ? { types: new Map(app.core.types.map((t) => [t.id, t])), year } : null);
  const students = $derived(cls && course ? courseStudents(cls, course) : []);
  const assessments = $derived(
    course && year ? sortedAssessments(course).filter((a) => period === 'jahr' || halfOf(a.date, year) === period) : [],
  );
  const warnings = $derived(cls && course && year ? courseWarnings(cls, course, app.core, year, today) : []);

  /** Note je Schüler und Leistungsnachweis für schnellen Zugriff. */
  const gradeMap = $derived.by(() => {
    const m = new Map<string, Grade>();
    for (const g of course?.grades ?? []) if (g.assessmentId) m.set(`${g.assessmentId}|${g.studentId}`, g);
    return m;
  });

  function singles(studentId: string): Grade[] {
    if (!course || !year) return [];
    return course.grades
      .filter((g) => !g.assessmentId && g.studentId === studentId && (period === 'jahr' || halfOf(g.performedAt.slice(0, 10), year) === period))
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }

  function summary(s: Student) {
    return summarize(entriesFor(course!, s.id, ctx!, period));
  }

  function columnAvg(a: Assessment): string {
    const vals = students
      .map((s) => gradeMap.get(`${a.id}|${s.id}`))
      .filter((g): g is Grade => !!g && g.value !== null && g.status !== 'nicht_gewertet' && g.status !== 'nachtermin')
      .map((g) => ({ value: g.value!, weight: 1 }));
    return formatAvg(weightedAverage(vals));
  }

  function filled(a: Assessment): number {
    return students.filter((s) => gradeMap.has(`${a.id}|${s.id}`)).length;
  }
</script>

{#if !cls || !course || !year || !ctx}
  <div class="p-8"><Empty icon="book" title="Kurs nicht gefunden" /></div>
{:else}
  <PageHeader title={subject?.name ?? 'Fach'} eyebrow="Klasse {cls.name} · {course.weeklyHours} Wochenstunden{course.testModel ? ' · Testmodell' : ''}" back={href.cls(cls.id)}>
    {#snippet actions()}
      <button class="btn btn-ghost" onclick={() => (courseOpen = true)} title="Kurs bearbeiten"><Icon name="settings" size={15} /></button>
      <a class="btn btn-ghost" href={href.print(cls.id, course.id)}><Icon name="print" size={15} /> Drucken</a>
      <a class="btn btn-soft" href={href.report(cls.id, course.id)}><Icon name="award" size={15} /> Zeugnisnoten</a>
      <a class="btn btn-soft" href={href.quick(cls.id, course.id)}><Icon name="zap" size={15} /> Mündliche Noten</a>
      <button class="btn btn-primary" onclick={() => (assessOpen = true)}><Icon name="plus" size={15} /> Leistungsnachweis</button>
    {/snippet}
    <div class="flex items-center justify-between gap-4">
      <Segmented bind:value={period} options={[{ value: 1, label: '1. Halbjahr' }, { value: 2, label: '2. Halbjahr' }, { value: 'jahr', label: 'Schuljahr' }]} />
      <div class="hidden items-center gap-3 text-[12px] text-slate-500 md:flex">
        <span class="flex items-center gap-1"><span class="kbd">1</span>–<span class="kbd">6</span> Note</span>
        <span class="flex items-center gap-1"><span class="kbd">↵</span> weiter</span>
        <span class="flex items-center gap-1">Doppelklick: Status, Bemerkung</span>
      </div>
    </div>
  </PageHeader>

  <div class="px-8 py-6">
    {#if !students.length}
      <Empty icon="users" title="Keine Schülerinnen und Schüler" text="Füge zuerst Schülerinnen und Schüler zur Klasse hinzu.">
        <a class="btn btn-primary" href={href.cls(cls.id)}>Zur Klasse</a>
      </Empty>
    {:else}
      <div class="card overflow-x-auto">
        <table class="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr class="text-left align-bottom">
              <th class="sticky left-0 z-10 min-w-52 border-b border-slate-200/70 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-line-dark dark:bg-panel-dark">
                Name
              </th>
              {#each assessments as a (a.id)}
                {@const t = typeById(a.typeId)}
                <th class="min-w-20 border-b border-l border-slate-200/70 px-1.5 py-2 text-center font-normal dark:border-line-dark">
                  <a href={href.assessment(cls.id, course.id, a.id)} class="group block rounded-lg px-1 py-1 transition hover:bg-brand-50 dark:hover:bg-white/5" title={a.title}>
                    <div class="text-[11px] font-bold {t?.category === 'gross' ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500'}">{t?.short ?? '?'}</div>
                    <div class="text-[11px] tabular-nums text-slate-400">{fmtShortDate(a.date)}</div>
                    {#if a.maxPoints}<div class="text-[10px] text-slate-400">/{String(a.maxPoints).replace('.', ',')} P</div>{/if}
                  </a>
                </th>
              {/each}
              <th class="min-w-44 border-b border-l border-slate-200/70 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-line-dark">Einzelnoten</th>
              <th class="w-16 border-b border-l border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[11px] font-semibold text-slate-400 dark:border-line-dark dark:bg-white/[0.02]" title="Schnitt große Leistungsnachweise">Ø groß</th>
              <th class="w-16 border-b border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[11px] font-semibold text-slate-400 dark:border-line-dark dark:bg-white/[0.02]" title="Schnitt kleine Leistungsnachweise">Ø klein</th>
              <th class="w-16 border-b border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[11px] font-semibold text-slate-700 dark:border-line-dark dark:bg-white/[0.02] dark:text-slate-300" title="Gewichteter Gesamtschnitt nach RSO § 23">Ø gesamt</th>
              <th class="w-14 border-b border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[11px] font-semibold text-slate-400 dark:border-line-dark dark:bg-white/[0.02]" title="Vorschlag; die Note setzt die Lehrkraft">Vorschl.</th>
            </tr>
          </thead>
          <tbody>
            {#each students as s, ri (s.id)}
              {@const sum = summary(s)}
              {@const sug = suggestGrade(sum.total, app.core.settings.rounding)}
              <tr class="group">
                <td class="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-1 transition group-hover:bg-brand-50/60 dark:border-line-dark dark:bg-panel-dark dark:group-hover:bg-[#1a1e2a]">
                  <a href={href.student(cls.id, s.id)} class="block truncate font-medium hover:text-brand-600 {s.leftAt ? 'text-slate-400 line-through' : ''}">
                    {s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span>
                  </a>
                  {#if s.support}<div class="truncate text-[10.5px] text-violet-600 dark:text-violet-300">{s.support}</div>{/if}
                </td>
                {#each assessments as a, ci (a.id)}
                  {@const g = gradeMap.get(`${a.id}|${s.id}`)}
                  <td class="border-b border-l border-slate-100 px-1.5 py-1 transition group-hover:bg-brand-50/40 dark:border-line-dark dark:group-hover:bg-white/[0.02]">
                    <GradeCell
                      grade={g}
                      assessment={a}
                      gradeKey={gradeKeyById(a.gradeKeyId)}
                      row={ri}
                      col={ci}
                      oncommit={(v) => setAssessmentGrade(cls, course, a, s.id, v.value === null && v.points === null ? null : { ...v, comment: g?.comment ?? '' })}
                      onopen={() => (gradeDlg = { student: s, grade: g ?? null, a })}
                    />
                  </td>
                {/each}
                <td class="border-b border-l border-slate-100 px-3 py-1 transition group-hover:bg-brand-50/40 dark:border-line-dark dark:group-hover:bg-white/[0.02]">
                  <div class="flex flex-wrap items-center gap-1">
                    {#each singles(s.id) as g (g.id)}
                      {@const t = typeById(g.typeId)}
                      <button class="transition hover:-translate-y-px" onclick={() => (gradeDlg = { student: s, grade: g })} title="{t?.name ?? ''}{g.title ? ` · ${g.title}` : ''} · {new Date(g.performedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}{g.comment ? `\n${g.comment}` : ''}">
                        <GradeBadge value={g.value} status={g.status} size="sm" />
                      </button>
                    {/each}
                    <button class="grid h-6 w-6 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100 dark:hover:bg-white/10" onclick={() => (gradeDlg = { student: s, grade: null })} aria-label="Einzelnote hinzufügen">
                      <Icon name="plus" size={13} stroke={2.25} />
                    </button>
                  </div>
                </td>
                <td class="border-b border-l border-slate-100 bg-slate-50/50 px-2 text-center tabular-nums text-slate-500 dark:border-line-dark dark:bg-white/[0.015]">{formatAvg(sum.big)}</td>
                <td class="border-b border-slate-100 bg-slate-50/50 px-2 text-center tabular-nums text-slate-500 dark:border-line-dark dark:bg-white/[0.015]">{formatAvg(sum.small)}</td>
                <td class="border-b border-slate-100 bg-slate-50/50 px-2 text-center font-semibold tabular-nums text-slate-900 dark:border-line-dark dark:bg-white/[0.015] dark:text-white">{formatAvg(sum.total)}</td>
                <td class="border-b border-slate-100 bg-slate-50/50 px-2 text-center dark:border-line-dark dark:bg-white/[0.015]">
                  {#if sug}<span class="inline-grid h-6 w-6 place-items-center rounded-md text-[12px] font-bold ring-1 ring-inset {GRADE_CLASS[sug]}">{sug}</span>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
          {#if assessments.length}
            <tfoot>
              <tr class="text-[12px] text-slate-500">
                <td class="sticky left-0 bg-white px-4 py-2.5 font-medium dark:bg-panel-dark">Klassenschnitt</td>
                {#each assessments as a (a.id)}
                  <td class="border-l border-slate-100 px-1.5 py-2.5 text-center tabular-nums dark:border-line-dark">
                    <div class="font-semibold text-slate-700 dark:text-slate-200">{columnAvg(a)}</div>
                    <div class="text-[10.5px] text-slate-400">{filled(a)}/{students.length}</div>
                  </td>
                {/each}
                <td colspan="5" class="border-l border-slate-100 dark:border-line-dark"></td>
              </tr>
            </tfoot>
          {/if}
        </table>
      </div>

      {#if !assessments.length}
        <div class="mt-6">
          <Empty icon="list" title="Noch keine Leistungsnachweise in diesem Zeitraum" text="Lege eine Schulaufgabe, Kurzarbeit oder Stegreifaufgabe an. Mündliche Noten trägst du über „Mündliche Noten“ oder das Plus in der Spalte Einzelnoten ein.">
            <button class="btn btn-primary" onclick={() => (assessOpen = true)}><Icon name="plus" size={15} /> Leistungsnachweis anlegen</button>
          </Empty>
        </div>
      {/if}

      {#if warnings.length}
        <section class="mt-7 max-w-3xl">
          <h2 class="mb-3 text-[13px] font-semibold uppercase tracking-wider text-slate-400">Hinweise nach RSO</h2>
          <WarningList {warnings} />
        </section>
      {/if}
    {/if}
  </div>

  <AssessmentDialog bind:open={assessOpen} {cls} {course} />
  <CourseDialog bind:open={courseOpen} {cls} {course} />
  {#if gradeDlg}
    <GradeDialog open={true} {cls} {course} student={gradeDlg.student} grade={gradeDlg.grade} forAssessment={gradeDlg.a ?? null} onclose={() => (gradeDlg = null)} />
  {/if}
{/if}
