<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { app } from '../lib/state/app.svelte';
  import { addAssessment, removeAssessment, todayIso, updateAssessment } from '../lib/state/actions';
  import { pointRanges } from '../lib/domain/gradeKey';
  import { go, href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { Assessment, Course, SchoolClass } from '../lib/domain/types';
  import { GRADE_CLASS } from '../ui/colors';

  let {
    open = $bindable(false),
    cls,
    course,
    assessment = null,
  }: { open?: boolean; cls: SchoolClass; course: Course; assessment?: Assessment | null } = $props();

  let typeId = $state('');
  let title = $state('');
  let date = $state(todayIso());
  let weight = $state<number | null>(null);
  let usePoints = $state(false);
  let maxPoints = $state<number | null>(null);
  let gradeKeyId = $state('');
  let confirmDelete = $state(false);

  const types = $derived(
    app.core.types.filter((t) => !t.archived && (t.mode === 'schriftlich' || t.kind === 'praktisch' || t.kind === 'referat' || t.kind === 'gleichwertig')),
  );
  const type = $derived(app.core.types.find((t) => t.id === typeId));
  const key = $derived(app.core.gradeKeys.find((k) => k.id === gradeKeyId) ?? app.core.gradeKeys[0]);
  const ranges = $derived(usePoints && maxPoints && maxPoints > 0 ? pointRanges(key, maxPoints) : []);
  const hasGrades = $derived(!!assessment && course.grades.some((g) => g.assessmentId === assessment!.id));

  $effect(() => {
    if (!open) return;
    confirmDelete = false;
    const preferred = course.testModel ? 'typ-angesagter_test' : 'typ-schulaufgabe';
    typeId = assessment?.typeId ?? (types.some((t) => t.id === preferred) ? preferred : types[0]?.id);
    title = assessment?.title ?? '';
    date = assessment?.date ?? todayIso();
    weight = assessment?.weight ?? null;
    usePoints = !!assessment?.maxPoints;
    maxPoints = assessment?.maxPoints ?? null;
    gradeKeyId = assessment?.gradeKeyId ?? app.core.settings.defaultGradeKeyId;
  });

  function nextTitle(): string {
    if (!type) return '';
    const n = course.assessments.filter((a) => a.typeId === type.id).length + 1;
    return `${n}. ${type.name.replace(/ \(.*\)$/, '')}`;
  }

  function save(e: Event) {
    e.preventDefault();
    if (!type) return;
    const data = {
      typeId,
      title: title.trim() || nextTitle(),
      date,
      weight: weight === null || Number.isNaN(weight) || weight === type.weight ? null : weight,
      maxPoints: usePoints && maxPoints ? maxPoints : null,
      gradeKeyId: usePoints ? gradeKeyId : null,
    };
    if (assessment) {
      updateAssessment(cls, course, assessment.id, data);
      toast.success('Leistungsnachweis gespeichert.');
    } else {
      const a = addAssessment(cls, course, data);
      go(href.assessment(cls.id, course.id, a.id));
    }
    open = false;
  }

  function del() {
    if (!assessment) return;
    removeAssessment(cls, course, assessment.id);
    open = false;
    toast.info('Leistungsnachweis gelöscht.');
    go(href.course(cls.id, course.id));
  }
</script>

<Modal bind:open title={assessment ? 'Leistungsnachweis bearbeiten' : 'Neuer Leistungsnachweis'} width="max-w-xl">
  <form id="assess-form" onsubmit={save} class="grid gap-4">
    <div class="grid grid-cols-[1fr_11rem] gap-3">
      <label>
        <span class="label">Art</span>
        <select class="field" bind:value={typeId}>
          {#each types as t (t.id)}<option value={t.id}>{t.name} · {t.category === 'gross' ? 'groß' : 'klein'}</option>{/each}
        </select>
      </label>
      <label><span class="label">Datum</span><input class="field" type="date" bind:value={date} /></label>
    </div>
    <div class="grid grid-cols-[1fr_8rem] gap-3">
      <label><span class="label">Titel</span><input class="field" bind:value={title} placeholder={nextTitle()} /></label>
      <label>
        <span class="label">Gewicht</span>
        <input class="field" type="number" min="0" step="0.5" bind:value={weight} placeholder={String(type?.weight ?? 1)} />
      </label>
    </div>
    {#if type?.category === 'gross' && weight !== null && weight !== 2}
      <p class="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Laut RSO § 23 Abs. 2 Satz 3 haben Schulaufgaben und angesagte Tests doppeltes Gewicht.</p>
    {/if}

    <label class="flex items-center gap-2.5 text-[13px]"><input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={usePoints} /> Mit Punkten und Notenschlüssel bewerten</label>

    {#if usePoints}
      <div class="grid grid-cols-2 gap-3">
        <label><span class="label">Höchstpunktzahl</span><input class="field" type="number" min="1" step="0.5" bind:value={maxPoints} /></label>
        <label>
          <span class="label">Notenschlüssel</span>
          <select class="field" bind:value={gradeKeyId}>
            {#each app.core.gradeKeys as k (k.id)}<option value={k.id}>{k.name} ({k.thresholds.join(' / ')} %)</option>{/each}
          </select>
        </label>
      </div>
      {#if ranges.length}
        <div class="grid grid-cols-6 gap-1.5">
          {#each ranges as r (r.grade)}
            <div class="rounded-xl px-2 py-2 text-center ring-1 ring-inset {GRADE_CLASS[r.grade]}">
              <div class="text-[15px] font-semibold">{r.grade}</div>
              <div class="text-[11px] tabular-nums opacity-80">{String(r.from).replace('.', ',')}–{String(r.to).replace('.', ',')}</div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </form>
  {#snippet footer()}
    {#if assessment}
      {#if confirmDelete}
        <span class="mr-auto flex items-center gap-2 text-[12px] text-rose-600">
          {hasGrades ? 'Alle Noten dazu werden gelöscht.' : 'Wirklich löschen?'}
          <button type="button" class="btn btn-danger h-8" onclick={del}>Löschen</button>
        </span>
      {:else}
        <button type="button" class="btn btn-ghost mr-auto text-rose-600" onclick={() => (confirmDelete = true)}>Löschen</button>
      {/if}
    {/if}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Abbrechen</button>
    <button form="assess-form" class="btn btn-primary" disabled={!typeId || (usePoints && !(maxPoints && maxPoints > 0))}>{assessment ? 'Speichern' : 'Anlegen und Noten erfassen'}</button>
  {/snippet}
</Modal>
