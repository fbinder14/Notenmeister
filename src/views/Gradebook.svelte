<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../lib/state/app.svelte';
  import { courseWarnings, studentCompleteness } from '../lib/domain/rules';
  import { observationStats, openPhase } from '../lib/domain/observation';
  import { entriesFor, formatAvg, halfOf, needsReplacement, summarize, suggestGrade, weightedAverage, type Ctx } from '../lib/domain/grading';
  import {
    courseStudents,
    findClass,
    findCourse,
    fmtShortDate,
    gradeKeyById,
    isSport,
    setAssessmentGrade,
    STATUS_LABEL,
    startObservation,
    sortedAssessments,
    subjectOf,
    todayIso,
    typeById,
    yearOf,
  } from '../lib/state/actions';
  import { go, href } from '../lib/state/router.svelte';
  import type { Assessment, Grade, Period, Student } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import GradeCell from '../ui/GradeCell.svelte';
  import { describeOutcome, sportOutcome } from '../lib/domain/sport';
  import WarningList from '../ui/WarningList.svelte';
  import ObservationBadge from '../ui/ObservationBadge.svelte';
  import GradeTrash from '../ui/GradeTrash.svelte';
  import AssessmentDialog from '../dialogs/AssessmentDialog.svelte';
  import CourseDialog from '../dialogs/CourseDialog.svelte';
  import GradeDialog from '../dialogs/GradeDialog.svelte';
  import { GRADE_CLASS } from '../ui/colors';

  let { classId, courseId }: { classId: string; courseId: string } = $props();

  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const sport = $derived(isSport(course));
  const year = $derived(cls ? yearOf(cls) : undefined);
  const subject = $derived(course ? subjectOf(course) : undefined);

  const today = todayIso();
  let period = $state<Period>(untrack(() => (year && today >= year.halfSwitch ? 2 : 1)));

  let assessOpen = $state(false);
  let courseOpen = $state(false);
  let gradeDlg = $state<{ student: Student; grade: Grade | null; a?: Assessment; replaces?: Assessment } | null>(null);

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

  /** Einzelnoten, die versäumte Leistungsnachweise ersetzen: Schlüssel Nachweis|Schüler. */
  const replacements = $derived.by(() => {
    const m = new Map<string, Grade>();
    for (const g of course?.grades ?? []) if (!g.assessmentId && g.replacesAssessmentId) m.set(`${g.replacesAssessmentId}|${g.studentId}`, g);
    return m;
  });

  /** Versäumte Nachweise des Zeitraums, für die noch die Ersatznote fehlt. */
  function openReplacements(studentId: string): Assessment[] {
    return assessments.filter((a) => needsReplacement(gradeMap.get(`${a.id}|${studentId}`)) && !replacements.has(`${a.id}|${studentId}`));
  }

  /** Herkunft einer Note aus einer Unterrichtsbeobachtung, für den Tooltip. */
  function observationNote(g: Grade): string {
    const p = g.observationId ? course?.observations?.find((x) => x.id === g.observationId) : undefined;
    if (!p) return '';
    const s = observationStats(p.entries);
    return ` · aus Beobachtung ${s.first ? `${fmtShortDate(s.first)}–${fmtShortDate(s.last!)}` : ''} (${s.count})`;
  }

  function beginObservation(s: Student) {
    if (!cls || !course) return;
    startObservation(cls, course, s.id);
    go(href.observation(cls.id, course.id, s.id));
  }

  function assessmentLabel(a: Assessment): string {
    return `${typeById(a.typeId)?.short ?? '?'} ${fmtShortDate(a.date)}`;
  }

  function replacedBy(a: Assessment, studentId: string): string {
    const r = replacements.get(`${a.id}|${studentId}`);
    if (!r) return '';
    const t = typeById(r.typeId);
    return `${t?.short ?? 'Einzelnote'}${r.value ? ` ${r.value}` : ''}`;
  }

  function summary(s: Student) {
    return summarize(entriesFor(course!, s.id, ctx!, period));
  }

  const completeness = $derived(
    course && ctx ? new Map(students.map((s) => [s.id, studentCompleteness(course, s.id, ctx, period)])) : new Map(),
  );
  const completeCount = $derived([...completeness.values()].filter((c) => c.complete).length);
  const periodLabel = $derived(period === 'jahr' ? 'Schuljahr' : `${period}. Halbjahr`);

  function columnAvg(a: Assessment): string {
    const vals = students
      .map((s) => gradeMap.get(`${a.id}|${s.id}`))
      .filter((g): g is Grade => !!g && g.value !== null && g.status !== 'nicht_gewertet' && g.status !== 'nachtermin')
      .map((g) => ({ value: g.value!, weight: 1 }));
    return formatAvg(weightedAverage(vals));
  }

  /** Einzelnoten (Rechenschaftsablage, Unterrichtsbeitrag …) je Art im gewählten Zeitraum. */
  const singleStats = $derived.by(() => {
    if (!course || !year) return [];
    const ids = new Set(students.map((s) => s.id));
    const m = new Map<string, { students: Set<string>; n: number; vals: { value: number; weight: number }[] }>();
    for (const g of course.grades) {
      if (g.assessmentId || !g.typeId || !ids.has(g.studentId)) continue;
      if (period !== 'jahr' && halfOf(g.performedAt.slice(0, 10), year) !== period) continue;
      const e = m.get(g.typeId) ?? { students: new Set<string>(), n: 0, vals: [] };
      e.students.add(g.studentId);
      e.n++;
      if (g.value !== null && g.status !== 'nicht_gewertet' && g.status !== 'nachtermin') e.vals.push({ value: g.value, weight: 1 });
      m.set(g.typeId, e);
    }
    return [...m.entries()]
      .map(([typeId, e]) => ({ t: typeById(typeId), reached: e.students.size, n: e.n, avg: formatAvg(weightedAverage(e.vals)) }))
      .sort((x, y) => (x.t?.name ?? '').localeCompare(y.t?.name ?? ''));
  });

  function filled(a: Assessment): number {
    return students.filter((s) => gradeMap.has(`${a.id}|${s.id}`)).length;
  }
</script>

{#if !cls || !course || !year || !ctx}
  <div class="p-8"><Empty icon="book" title="Unterricht nicht gefunden" /></div>
{:else}
  <PageHeader title={subject?.name ?? 'Fach'} eyebrow="Klasse {cls.name} · {course.weeklyHours} Wochenstunden{course.testModel ? ' · Testmodell' : ''}" back={href.cls(cls.id)}>
    {#snippet actions()}
      <button class="btn btn-ghost" onclick={() => (courseOpen = true)} title="Unterricht bearbeiten"><Icon name="settings" size={15} /></button>
      <a class="btn btn-ghost" href={href.print(cls.id, course.id)}><Icon name="print" size={15} /> Drucken</a>
      <a class="btn btn-soft" href={href.report(cls.id, course.id)}><Icon name="award" size={15} /> Zeugnisnoten</a>
      <a class="btn btn-soft" href={href.quick(cls.id, course.id)}><Icon name="zap" size={15} /> {sport ? 'Einzelnoten' : 'Mündliche Noten'}</a>
      <button class="btn btn-primary" onclick={() => (assessOpen = true)}><Icon name="plus" size={15} /> Leistungsnachweis</button>
    {/snippet}
    <div class="flex items-center justify-between gap-4">
      <Segmented bind:value={period} options={[{ value: 1, label: '1. Halbjahr' }, { value: 2, label: '2. Halbjahr' }, { value: 'jahr', label: 'Schuljahr' }]} />
      <div class="hidden items-center gap-3 text-[0.75rem] text-slate-500 md:flex">
        <span class="flex items-center gap-1"><span class="kbd">1</span>–<span class="kbd">6</span> Note</span>
        <span class="flex items-center gap-1"><span class="kbd">↵</span> weiter</span>
        <span class="flex items-center gap-1"><span class="kbd">X</span> nicht teilgenommen</span>
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
        <table class="w-full border-separate border-spacing-0 text-[0.8125rem]">
          <thead>
            <tr class="text-left align-bottom">
              <th class="sticky left-0 z-10 min-w-52 border-b border-slate-200/70 bg-white px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 dark:border-line-dark dark:bg-panel-dark">
                Name
              </th>
              {#each assessments as a (a.id)}
                {@const t = typeById(a.typeId)}
                <th class="min-w-20 border-b border-l border-slate-200/70 px-1.5 py-2 text-center font-normal dark:border-line-dark">
                  <a href={href.assessment(cls.id, course.id, a.id)} class="group block rounded-lg px-1 py-1 transition hover:bg-brand-50 dark:hover:bg-white/5" title={a.title}>
                    <div class="text-[0.6875rem] font-bold {t?.category === 'gross' ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500'}">{t?.short ?? '?'}</div>
                    <div class="text-[0.6875rem] tabular-nums text-slate-400">{fmtShortDate(a.date)}</div>
                    {#if a.maxPoints}<div class="text-[0.625rem] text-slate-400">/{String(a.maxPoints).replace('.', ',')} P</div>{/if}
                  </a>
                </th>
              {/each}
              <th class="min-w-44 border-b border-l border-slate-200/70 px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 dark:border-line-dark">Einzelnoten</th>
              <th class="w-16 border-b border-l border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[0.6875rem] font-semibold text-slate-400 dark:border-line-dark dark:bg-white/[0.02]" title="Liegen alle nach RSO erforderlichen Noten für das {periodLabel} vor?">Noten</th>
              <th class="w-16 border-b border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[0.6875rem] font-semibold text-slate-700 dark:border-line-dark dark:bg-white/[0.02] dark:text-slate-300" title="Gewichteter Gesamtschnitt nach RSO § 23">Ø gesamt</th>
              <th class="w-14 border-b border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center text-[0.6875rem] font-semibold text-slate-400 dark:border-line-dark dark:bg-white/[0.02]" title="Vorschlag; die Note setzt die Lehrkraft">Vorschl.</th>
            </tr>
          </thead>
          <tbody>
            {#each students as s, ri (s.id)}
              {@const sum = summary(s)}
              {@const sug = suggestGrade(sum.total, app.core.settings.rounding)}
              {@const done = completeness.get(s.id)}
              <tr class="group">
                <td class="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-1 transition group-hover:bg-brand-50/60 dark:border-line-dark dark:bg-panel-dark dark:group-hover:bg-[#1a1e2a]">
                  <a href={href.student(cls.id, s.id)} class="block truncate font-medium hover:text-brand-600 {s.leftAt ? 'text-slate-400 line-through' : ''}">
                    {s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span>
                  </a>
                  {#if s.support}<div class="truncate text-[0.65625rem] text-violet-600 dark:text-violet-300">{s.support}</div>{/if}
                  {#if openPhase(course, s.id)}
                    <div class="mt-0.5"><ObservationBadge phase={openPhase(course, s.id)!} link={href.observation(cls.id, course.id, s.id)} /></div>
                  {/if}
                </td>
                {#each assessments as a, ci (a.id)}
                  {@const g = gradeMap.get(`${a.id}|${s.id}`)}
                  <td class="border-b border-l border-slate-100 px-1.5 py-1 transition group-hover:bg-brand-50/40 dark:border-line-dark dark:group-hover:bg-white/[0.02]">
                    {#if a.sport}
                      {@const o = g?.sport ? sportOutcome(a.sport, g.sport, app.core.settings.rounding) : null}
                      <a
                        href={href.assessment(cls.id, course.id, a.id)}
                        data-cell="{ri}-{ci}"
                        class="mx-auto flex h-8 w-full items-center justify-center rounded-lg outline-none ring-1 ring-inset ring-transparent transition hover:bg-slate-900/5 focus:ring-brand-400 dark:hover:bg-white/5"
                        title={g && g.status !== 'gewertet' ? g.comment || STATUS_LABEL[g.status] : o ? o.parts.map(describeOutcome).filter(Boolean).join(' · ') || 'Messwerte erfassen' : 'Messwerte erfassen'}
                      >
                        {#if g && (g.value || g.status !== 'gewertet')}
                          <GradeBadge value={g.value} status={g.status} />
                        {:else if g?.sport}
                          <span class="text-[0.6875rem] text-amber-600">offen</span>
                        {:else}
                          <span class="text-slate-300 dark:text-slate-600">·</span>
                        {/if}
                      </a>
                    {:else}
                    <GradeCell
                      grade={g}
                      assessment={a}
                      gradeKey={gradeKeyById(a.gradeKeyId)}
                      row={ri}
                      col={ci}
                      replacedBy={replacedBy(a, s.id)}
                      oncommit={(v) => setAssessmentGrade(cls, course, a, s.id, !v.status && v.value === null && v.points === null ? null : { comment: g?.comment ?? '', ...v })}
                      onopen={() => (gradeDlg = { student: s, grade: g ?? null, a })}
                    />
                    {/if}
                  </td>
                {/each}
                <td class="border-b border-l border-slate-100 px-3 py-1 transition group-hover:bg-brand-50/40 dark:border-line-dark dark:group-hover:bg-white/[0.02]">
                  <div class="flex flex-wrap items-center gap-1">
                    {#each singles(s.id) as g (g.id)}
                      {@const t = typeById(g.typeId)}
                      {@const rep = g.replacesAssessmentId ? course.assessments.find((x) => x.id === g.replacesAssessmentId) : undefined}
                      <button class="flex items-center gap-0.5 transition hover:-translate-y-px" onclick={() => (gradeDlg = { student: s, grade: g })} title="{t?.name ?? ''}{observationNote(g)}{rep ? ` · Ersatz für ${typeById(rep.typeId)?.name ?? 'Leistungsnachweis'} vom ${fmtShortDate(rep.date)}` : ''}{g.title ? ` · ${g.title}` : ''} · {new Date(g.performedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}{g.comment ? `\n${g.comment}` : ''}">
                        <GradeBadge value={g.value} status={g.status} size="sm" />
                        {#if rep}<span class="text-[0.65625rem] font-medium text-emerald-600 dark:text-emerald-400">← {typeById(rep.typeId)?.short ?? '?'}</span>{/if}
                      </button>
                    {/each}
                    {#each openReplacements(s.id) as a (a.id)}
                      <button
                        class="inline-flex h-6 items-center gap-0.5 rounded-md border border-dashed border-amber-400 bg-amber-50 px-1.5 text-[0.6875rem] font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        onclick={() => (gradeDlg = { student: s, grade: null, replaces: a })}
                        title="Gefehlt bei „{a.title || typeById(a.typeId)?.name}“ – Ersatznote erfassen"
                      >
                        <Icon name="plus" size={11} stroke={2.5} /> Ersatz {assessmentLabel(a)}
                      </button>
                    {/each}
                    <button class="grid h-6 w-6 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100 dark:hover:bg-white/10" onclick={() => (gradeDlg = { student: s, grade: null })} aria-label="Einzelnote hinzufügen">
                      <Icon name="plus" size={13} stroke={2.25} />
                    </button>
                    {#if !openPhase(course, s.id)}
                      <button class="grid h-6 w-6 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100 dark:hover:bg-white/10" onclick={() => beginObservation(s)} title="Unterrichtsbeobachtung starten" aria-label="Unterrichtsbeobachtung starten">
                        <Icon name="eye" size={13} stroke={2} />
                      </button>
                    {/if}
                  </div>
                </td>
                <td class="border-b border-l border-slate-100 bg-slate-50/50 px-2 text-center dark:border-line-dark dark:bg-white/[0.015]">
                  {#if done?.complete}
                    <span class="inline-grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30" title="Alle erforderlichen Noten für das {periodLabel} liegen vor.">
                      <Icon name="check" size={14} stroke={2.75} />
                    </span>
                  {:else if done}
                    <span class="inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-white/10" title="Für das {periodLabel} fehlt noch:\n– {done.missing.join('\n– ')}">
                      {done.missing.length}
                    </span>
                  {/if}
                </td>
                <td class="border-b border-slate-100 bg-slate-50/50 px-2 text-center font-semibold tabular-nums text-slate-900 dark:border-line-dark dark:bg-white/[0.015] dark:text-white">{formatAvg(sum.total)}</td>
                <td class="border-b border-slate-100 bg-slate-50/50 px-2 text-center dark:border-line-dark dark:bg-white/[0.015]">
                  {#if sug}<span class="inline-grid h-6 w-6 place-items-center rounded-md text-[0.75rem] font-bold ring-1 ring-inset {GRADE_CLASS[sug]}">{sug}</span>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
          {#if assessments.length || singleStats.length}
            <tfoot>
              <tr class="text-[0.75rem] text-slate-500">
                <td class="sticky left-0 bg-white px-4 py-2.5 font-medium dark:bg-panel-dark">Klassenschnitt</td>
                {#each assessments as a (a.id)}
                  <td class="border-l border-slate-100 px-1.5 py-2.5 text-center tabular-nums dark:border-line-dark">
                    <div class="font-semibold text-slate-700 dark:text-slate-200">{columnAvg(a)}</div>
                    <div class="text-[0.65625rem] text-slate-400">{filled(a)}/{students.length}</div>
                  </td>
                {/each}
                <td class="border-l border-slate-100 px-3 py-2 align-top dark:border-line-dark">
                  <div class="grid gap-1">
                    {#each singleStats as st (st.t?.id)}
                      <div
                        class="flex items-baseline gap-1.5 whitespace-nowrap"
                        title="{st.t?.name}: {st.reached} von {students.length} Schülerinnen und Schülern mindestens einmal bewertet, {st.n} Note{st.n === 1 ? '' : 'n'}, Schnitt {st.avg}"
                      >
                        <span class="w-7 text-[0.6875rem] font-bold text-slate-500">{st.t?.short ?? '?'}</span>
                        <span class="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{st.reached}/{students.length}</span>
                        <span class="text-[0.65625rem] text-slate-400">· {st.n} Noten · Ø {st.avg}</span>
                      </div>
                    {/each}
                  </div>
                </td>
                <td class="border-l border-slate-100 px-2 py-2.5 text-center tabular-nums dark:border-line-dark" title="{completeCount} von {students.length} mit allen erforderlichen Noten">
                  <div class="font-semibold {completeCount === students.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}">{completeCount}/{students.length}</div>
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          {/if}
        </table>
      </div>

      {#if !assessments.length}
        <div class="mt-6">
          <Empty icon="list" title="Noch keine Leistungsnachweise in diesem Zeitraum" text={sport ? 'Lege einen sportpraktischen Leistungsnachweis an, z. B. einen Lauf mit Zeiten aus der ISB-Tabelle oder ein Spiel mit Teilnoten. Einzelnoten (z. B. Einsatz und Fairness) trägst du über „Einzelnoten“ oder das Plus in der Spalte Einzelnoten ein.' : 'Lege eine Schulaufgabe, Kurzarbeit oder Stegreifaufgabe an. Mündliche Noten trägst du über „Mündliche Noten“ oder das Plus in der Spalte Einzelnoten ein.'}>
            <button class="btn btn-primary" onclick={() => (assessOpen = true)}><Icon name="plus" size={15} /> Leistungsnachweis anlegen</button>
          </Empty>
        </div>
      {/if}

      {#if warnings.length}
        <section class="mt-7 max-w-3xl">
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Hinweise nach RSO</h2>
          <WarningList {warnings} />
        </section>
      {/if}

      <GradeTrash {cls} {course} />
    {/if}
  </div>

  <AssessmentDialog bind:open={assessOpen} {cls} {course} />
  <CourseDialog bind:open={courseOpen} {cls} {course} />
  {#if gradeDlg}
    <GradeDialog open={true} {cls} {course} student={gradeDlg.student} grade={gradeDlg.grade} forAssessment={gradeDlg.a ?? null} replaces={gradeDlg.replaces ?? null} onclose={() => (gradeDlg = null)} />
  {/if}
{/if}
