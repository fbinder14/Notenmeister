<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import Icon from '../ui/Icon.svelte';
  import { app } from '../lib/state/app.svelte';
  import {
    addSingleGrade,
    allowsMakeup,
    fmtDateTime,
    fmtShortDate,
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
  import { href } from '../lib/state/router.svelte';
  import { observationStats } from '../lib/domain/observation';
  import Stars from '../ui/Stars.svelte';

  /** Bearbeitet eine Einzelnote oder legt eine neue an (grade = null). */
  let {
    open = $bindable(false),
    cls,
    course,
    student,
    grade = null,
    defaultTypeId = 'typ-rechenschaftsablage',
    onclose,
    forAssessment = null,
    replaces = null,
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
    /** Neue Einzelnote als Ersatz für diesen versäumten Leistungsnachweis. */
    replaces?: Assessment | null;
  } = $props();

  /** Unterrichtsbeobachtung, aus der diese Note entstand. */
  const fromObservation = $derived(grade?.observationId ? course.observations?.find((p) => p.id === grade!.observationId) : undefined);
  const obsStats = $derived(observationStats(fromObservation?.entries ?? []));

  /** Versäumter Nachweis, den diese Note ersetzt (neu oder bestehend). */
  const replaced = $derived(replaces ?? (grade?.replacesAssessmentId ? course.assessments.find((a) => a.id === grade!.replacesAssessmentId) : undefined));
  const replacedLabel = $derived(replaced ? `${typeById(replaced.typeId)?.name ?? 'Leistungsnachweis'} vom ${new Date(`${replaced.date}T12:00:00`).toLocaleDateString('de-DE')}` : '');

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
    title = grade?.title ?? (replaces ? `Ersatz für ${replaces.title || typeById(replaces.typeId)?.short || 'Leistungsnachweis'}` : '');
    typeId = grade?.typeId ?? defaultTypeId;
    weight = grade?.weight ?? null;
    performed = toLocalInput(grade?.performedAt ?? new Date().toISOString());
  });

  /** Verlauf, neueste Änderung zuerst; je Eintrag nur, was sich damals geändert hat. */
  const changes = $derived.by(() => {
    if (!grade) return [];
    const hs = grade.history;
    return hs
      .map((h, i) => {
        const after = i + 1 < hs.length ? hs[i + 1] : grade!;
        return { h, noteChanged: h.value !== after.value || h.status !== after.status, commentChanged: h.comment !== after.comment };
      })
      .reverse();
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
      addSingleGrade(cls, course, student.id, typeId, title, input, weight, replaces ? { replacesAssessmentId: replaces.id } : {});
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

<Modal bind:open title={grade ? 'Note bearbeiten' : replaces ? 'Ersatznote erfassen' : 'Einzelnote erfassen'} subtitle="{student.firstName} {student.lastName}{assessment ? ` · ${assessment.title}` : ''}" width="max-w-lg">
  <form id="grade-form" onsubmit={save} class="grid gap-4">
    {#if fromObservation}
      <a
        href={href.observation(cls.id, course.id, student.id)}
        onclick={() => (open = false)}
        class="-mb-1 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[0.78125rem] text-brand-800 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
      >
        <Icon name="eye" size={14} />
        <span>Aus Unterrichtsbeobachtung{obsStats.first ? ` ${fmtShortDate(obsStats.first)}–${fmtShortDate(obsStats.last!)}` : ''} · {obsStats.count} Beobachtung{obsStats.count === 1 ? '' : 'en'}</span>
        <span class="ml-auto flex items-center gap-1"><Stars value={obsStats.avg} size={12} /></span>
      </a>
    {/if}
    {#if replaced}
      <p class="-mb-1 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[0.78125rem] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        Ersatz für die versäumte {replacedLabel}.
      </p>
    {/if}
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
            {#each changes as c, i (i)}
              <li class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span class="tabular-nums">{fmtDateTime(c.h.at)}</span>
                {#if c.h.restoredFrom}<span>Wiederhergestellt (gelöscht am {fmtDateTime(c.h.restoredFrom)})</span>{/if}
                {#if c.noteChanged}
                  <span>Note vorher:</span>
                  <GradeBadge value={c.h.value} status={c.h.status} size="sm" />
                {/if}
                {#if c.commentChanged}<span class="truncate italic">Bemerkung vorher: „{c.h.comment || '–'}“</span>{/if}
                {#if c.h.performedAt}<span>Datum der Leistung vorher: {fmtDateTime(c.h.performedAt)}</span>{/if}
                {#if c.h.typeId !== undefined}<span>Art vorher: {typeById(c.h.typeId)?.name ?? '–'}</span>{/if}
                {#if c.h.weight !== undefined}<span>Gewicht vorher: {c.h.weight ?? 'Standard'}</span>{/if}
                {#if c.h.title !== undefined}<span>Thema vorher: „{c.h.title || '–'}“</span>{/if}
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
