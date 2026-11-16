<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import Icon from '../ui/Icon.svelte';
  import { app } from '../lib/state/app.svelte';
  import {
    addSingleGrade,
    allowsMakeup,
    fmtDateTime,
    fromLocalInput,
    removeGrade,
    setAssessmentGrade,
    STATUS_LABEL,
    toLocalInput,
    typeById,
    updateGrade,
  } from '../lib/state/actions';
  import type { Assessment, Course, Grade, GradeStatus, GradeValue, SchoolClass, Student } from '../lib/domain/types';
  import { toast } from '../lib/state/toast.svelte';

  /** Bearbeitet eine Einzelnote oder legt eine neue an (grade = null). */
  let {
    open = $bindable(false),
    cls,
    course,
    student,
    grade = null,
    defaultTypeId = 'typ-unterrichtsbeitrag',
    onclose,
    forAssessment = null,
  }: {
    open?: boolean;
    cls: SchoolClass;
    course: Course;
    student: Student;
    grade?: Grade | null;
    defaultTypeId?: string;
    onclose?: () => void;
    /** Neue Note zu diesem Leistungsnachweis statt einer Einzelnote. */
    forAssessment?: Assessment | null;
  } = $props();

  $effect(() => {
    if (!open) onclose?.();
  });

  let value = $state<GradeValue | null>(null);
  let status = $state<GradeStatus>('gewertet');
  let comment = $state('');
  let title = $state('');
  let typeId = $state('');
  let weight = $state<number | null>(null);
  let performed = $state('');

  const assessment = $derived(grade?.assessmentId ? course.assessments.find((a) => a.id === grade!.assessmentId) : forAssessment);
  const types = $derived(app.core.types.filter((t) => !t.archived));
  const type = $derived(app.core.types.find((t) => t.id === typeId));
  /** Nachtermin nur anbieten, wenn die Art nachgeholt wird (nicht z. B. bei Stegreifaufgaben). */
  const statusOptions = $derived(
    Object.entries(STATUS_LABEL).filter(
      ([k]) => k !== 'nachtermin' || grade?.status === 'nachtermin' || allowsMakeup(assessment ? typeById(assessment.typeId) : type),
    ),
  );

  $effect(() => {
    if (!open) return;
    value = grade?.value ?? null;
    status = grade?.status ?? 'gewertet';
    comment = grade?.comment ?? '';
    title = grade?.title ?? '';
    typeId = grade?.typeId ?? defaultTypeId;
    weight = grade?.weight ?? null;
    performed = toLocalInput(grade?.performedAt ?? new Date().toISOString());
  });

  const forcedSix = $derived(status === 'versaeumt' || status === 'verweigert' || status === 'unterschleif');
  const canSave = $derived(status === 'nachtermin' || forcedSix || value !== null);

  function save(e: Event) {
    e.preventDefault();
    if (!canSave) return;
    const input = { value, status, comment: comment.trim(), performedAt: fromLocalInput(performed) };
    if (grade) {
      updateGrade(cls, grade, { ...input, points: grade.points, title, typeId, weight });
    } else if (forAssessment) {
      setAssessmentGrade(cls, course, forAssessment, student.id, input);
    } else {
      addSingleGrade(cls, course, student.id, typeId, title, input, weight);
      toast.success(`Note für ${student.firstName} gespeichert.`);
    }
    open = false;
  }

  function del() {
    if (!grade) return;
    removeGrade(cls, course, grade.id);
    open = false;
  }
</script>

<Modal bind:open title={grade ? 'Note bearbeiten' : 'Einzelnote erfassen'} subtitle="{student.firstName} {student.lastName}{assessment ? ` · ${assessment.title}` : ''}" width="max-w-lg">
  <form id="grade-form" onsubmit={save} class="grid gap-4">
    <div>
      <span class="label">Note</span>
      <div class="grid grid-cols-6 gap-1.5">
        {#each [1, 2, 3, 4, 5, 6] as v (v)}
          <button
            type="button"
            disabled={forcedSix}
            class="h-11 rounded-xl text-[1rem] font-semibold ring-1 ring-inset transition active:scale-95 disabled:opacity-40 {(forcedSix ? 6 : status === 'nachtermin' ? null : value) === v
              ? 'bg-brand-600 text-white ring-brand-600 shadow-[0_6px_16px_-6px_rgb(79_70_229/0.7)]'
              : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300 dark:bg-white/5 dark:text-slate-200 dark:ring-line-dark'}"
            onclick={() => {
              value = v as GradeValue;
              // Nachtermin geschrieben: Note eintragen heißt, sie wird jetzt gewertet.
              if (status === 'nachtermin') status = 'gewertet';
            }}>{v}</button
          >
        {/each}
      </div>
      {#if grade?.points != null}<p class="mt-1.5 text-[0.75rem] text-slate-500">Aus {String(grade.points).replace('.', ',')} Punkten berechnet.</p>{/if}
    </div>

    {#if !assessment}
      <div class="grid grid-cols-[1fr_7rem] gap-3">
        <label>
          <span class="label">Art</span>
          <select class="field" bind:value={typeId}>
            {#each types as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </select>
        </label>
        <label><span class="label">Gewicht</span><input class="field" type="number" min="0" step="0.5" bind:value={weight} placeholder={String(type?.weight ?? 1)} /></label>
      </div>
      <label><span class="label">Thema / Titel</span><input class="field" bind:value={title} placeholder="optional" /></label>
    {/if}

    <div class="grid grid-cols-2 gap-3">
      <label>
        <span class="label">Status</span>
        <select class="field" bind:value={status}>
          {#each statusOptions as [k, l] (k)}<option value={k}>{l}</option>{/each}
        </select>
      </label>
      <label><span class="label">Datum und Uhrzeit</span><input class="field" type="datetime-local" bind:value={performed} /></label>
    </div>
    <label><span class="label">Bemerkung</span><textarea class="field h-20 resize-none py-2" bind:value={comment} placeholder="z. B. Thema, Grund für Nachtermin"></textarea></label>

    {#if grade}
      <div class="rounded-xl bg-slate-50 p-3.5 text-[0.75rem] text-slate-500 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2"><Icon name="clock" size={14} /> Erfasst am {fmtDateTime(grade.recordedAt)}</div>
        {#if grade.history.length}
          <div class="mt-2.5 flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300"><Icon name="history" size={14} /> Verlauf</div>
          <ul class="mt-1.5 grid gap-1">
            {#each [...grade.history].reverse() as h, i (i)}
              <li class="flex items-center gap-2">
                <span class="tabular-nums">{fmtDateTime(h.at)}</span>
                <span>vorher:</span>
                <GradeBadge value={h.value} status={h.status} size="sm" />
                {#if h.comment}<span class="truncate italic">„{h.comment}“</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </form>
  {#snippet footer()}
    {#if grade}<button type="button" class="btn btn-ghost mr-auto text-rose-600" onclick={del}><Icon name="trash" size={15} /> Löschen</button>{/if}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Abbrechen</button>
    <button form="grade-form" class="btn btn-primary" disabled={!canSave}>Speichern</button>
  {/snippet}
</Modal>
