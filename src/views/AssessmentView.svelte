<script lang="ts">
  import {
    courseStudents,
    findClass,
    findCourse,
    fmtDate,
    gradeKeyById,
    setAssessmentGrade,
    STATUS_LABEL,
    subjectOf,
    typeById,
  } from '../lib/state/actions';
  import { pointRanges } from '../lib/domain/gradeKey';
  import { href } from '../lib/state/router.svelte';
  import type { Assessment, Grade, Student } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import GradeCell from '../ui/GradeCell.svelte';
  import Distribution from '../ui/Distribution.svelte';
  import AssessmentDialog from '../dialogs/AssessmentDialog.svelte';
  import GradeDialog from '../dialogs/GradeDialog.svelte';
  import { GRADE_CLASS } from '../ui/colors';

  let { classId, courseId, assessmentId }: { classId: string; courseId: string; assessmentId: string } = $props();

  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const a = $derived(course?.assessments.find((x) => x.id === assessmentId));
  const t = $derived(typeById(a?.typeId));
  const key = $derived(gradeKeyById(a?.gradeKeyId));
  const students = $derived(cls && course ? courseStudents(cls, course).filter((s) => !s.leftAt) : []);
  const grades = $derived(new Map((course?.grades ?? []).filter((g) => g.assessmentId === assessmentId).map((g) => [g.studentId, g])));
  const values = $derived(
    [...grades.values()].filter((g) => g.value !== null && g.status !== 'nicht_gewertet' && g.status !== 'nachtermin').map((g) => g.value!),
  );
  const missing = $derived(students.filter((s) => !grades.has(s.id)).length);

  let editOpen = $state(false);
  let dlg = $state<{ student: Student; grade: Grade | null; a?: Assessment } | null>(null);

  function setComment(s: Student, g: Grade | undefined, comment: string) {
    if (!g) {
      if (!comment.trim()) return;
      dlg = { student: s, grade: null, a: a! };
      return;
    }
    if (comment === g.comment) return;
    setAssessmentGrade(cls!, course!, a!, s.id, { value: g.value, points: g.points, status: g.status, comment });
  }
</script>

{#if !cls || !course || !a}
  <div class="p-8"><Empty icon="list" title="Leistungsnachweis nicht gefunden" /></div>
{:else}
  <PageHeader title={a.title} eyebrow="{cls.name} · {subjectOf(course)?.name} · {t?.name} · {fmtDate(a.date)}" back={href.course(cls.id, course.id)}>
    {#snippet actions()}
      <button class="btn btn-soft" onclick={() => (editOpen = true)}><Icon name="edit" size={15} /> Bearbeiten</button>
    {/snippet}
  </PageHeader>

  <div class="mx-auto grid max-w-6xl gap-6 px-8 py-7 lg:grid-cols-[1fr_20rem]">
    <section class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-line-dark">
        <div>
          <h2 class="text-[14px] font-semibold">Sammeleingabe</h2>
          <p class="text-[12px] text-slate-500">
            {#if a.maxPoints}Punkte eintragen (max. {String(a.maxPoints).replace('.', ',')}), <span class="kbd">↵</span> springt weiter. Die Note wird berechnet.{:else}Ziffer 1–6 tippen – es geht automatisch weiter.{/if}
          </p>
        </div>
        <span class="rounded-full px-2.5 py-1 text-[12px] font-medium {missing ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}">
          {missing ? `${missing} offen` : 'vollständig'}
        </span>
      </div>
      <table class="w-full text-[13px]">
        <thead class="text-left text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th class="w-10 px-5 py-2 font-semibold">#</th>
            <th class="px-2 py-2 font-semibold">Name</th>
            <th class="w-28 px-2 py-2 text-center font-semibold">{a.maxPoints ? 'Punkte' : 'Note'}</th>
            <th class="px-2 py-2 font-semibold">Bemerkung</th>
            <th class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {#each students as s, i (s.id)}
            {@const g = grades.get(s.id)}
            <tr class="group border-t border-slate-100 transition hover:bg-brand-50/40 dark:border-line-dark dark:hover:bg-white/[0.02]">
              <td class="px-5 py-1.5 tabular-nums text-slate-400">{i + 1}</td>
              <td class="px-2 py-1.5 font-medium">{s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span></td>
              <td class="px-2 py-1">
                <GradeCell
                  grade={g}
                  assessment={a}
                  gradeKey={key}
                  row={i}
                  col={0}
                  oncommit={(v) => setAssessmentGrade(cls, course, a, s.id, v.value === null && v.points === null ? null : { ...v, comment: g?.comment ?? '' })}
                  onopen={() => (dlg = { student: s, grade: g ?? null, a })}
                />
              </td>
              <td class="px-2 py-1">
                <input
                  class="h-8 w-full rounded-lg border-0 bg-transparent px-2 text-[12.5px] text-slate-600 outline-none ring-1 ring-inset ring-transparent transition placeholder:text-slate-300 hover:ring-slate-200 focus:bg-white focus:ring-brand-400 dark:text-slate-300 dark:placeholder:text-slate-600 dark:hover:ring-line-dark dark:focus:bg-white/10"
                  value={g?.comment ?? ''}
                  placeholder={g ? (g.status !== 'gewertet' ? STATUS_LABEL[g.status] : '') : ''}
                  onchange={(e) => setComment(s, g, (e.target as HTMLInputElement).value)}
                  disabled={!g}
                />
              </td>
              <td class="px-2 py-1 text-right">
                <button class="btn btn-ghost h-7 w-7 px-0 opacity-0 transition group-hover:opacity-100" title="Status, Zeitstempel, Verlauf" onclick={() => (dlg = { student: s, grade: g ?? null, a })}>
                  <Icon name="edit" size={14} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <aside class="grid content-start gap-6">
      <div class="card p-5">
        <h2 class="mb-4 text-[14px] font-semibold">Notenspiegel</h2>
        <Distribution {values} />
      </div>
      <div class="card p-5 text-[13px]">
        <h2 class="mb-3 text-[14px] font-semibold">Angaben</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt class="text-slate-500">Art</dt><dd>{t?.name}</dd>
          <dt class="text-slate-500">Kategorie</dt><dd>{t?.category === 'gross' ? 'großer' : 'kleiner'} Leistungsnachweis</dd>
          <dt class="text-slate-500">Gewicht</dt><dd>{a.weight ?? t?.weight ?? 1}-fach</dd>
          <dt class="text-slate-500">Datum</dt><dd>{fmtDate(a.date)}</dd>
        </dl>
        {#if a.maxPoints}
          <h3 class="mb-2 mt-4 text-[12px] font-semibold text-slate-500">Notenschlüssel „{key.name}“</h3>
          <div class="grid grid-cols-3 gap-1.5">
            {#each pointRanges(key, a.maxPoints) as r (r.grade)}
              <div class="rounded-lg px-2 py-1.5 text-center ring-1 ring-inset {GRADE_CLASS[r.grade]}">
                <div class="text-[13px] font-semibold">{r.grade}</div>
                <div class="text-[10.5px] tabular-nums opacity-80">{String(r.from).replace('.', ',')}–{String(r.to).replace('.', ',')}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </aside>
  </div>

  <AssessmentDialog bind:open={editOpen} {cls} {course} assessment={a} />
  {#if dlg}
    <GradeDialog open={true} {cls} {course} student={dlg.student} grade={dlg.grade} forAssessment={dlg.a ?? null} onclose={() => (dlg = null)} />
  {/if}
{/if}
