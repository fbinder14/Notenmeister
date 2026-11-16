<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { app } from '../lib/state/app.svelte';
  import { addCourse, addSubject, sortStudents, updateCourse } from '../lib/state/actions';
  import { plannedSchulaufgabenFor, SUBJECT_SUGGESTIONS, weeklyHoursFor } from '../lib/domain/defaults';
  import { go, href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { Course, SchoolClass } from '../lib/domain/types';

  let { open = $bindable(false), cls, course = null }: { open?: boolean; cls: SchoolClass; course?: Course | null } = $props();

  let subjectId = $state('');
  let newSubject = $state('');
  let newShort = $state('');
  let hours = $state(2);
  let promotion = $state(true);
  let planned = $state(0);
  let testModel = $state(false);
  let excluded = $state<string[]>([]);

  $effect(() => {
    if (!open) return;
    subjectId = course?.subjectId ?? app.core.subjects[0]?.id ?? '__new';
    hours = course?.weeklyHours ?? 2;
    promotion = course?.promotionSubject ?? true;
    planned = course?.plannedSchulaufgaben ?? 0;
    testModel = course?.testModel ?? false;
    excluded = [...(course?.excludedStudentIds ?? [])];
    newSubject = '';
    newShort = '';
  });

  const subjectName = $derived(subjectId === '__new' ? newSubject : (app.core.subjects.find((s) => s.id === subjectId)?.name ?? ''));
  const suggestion = $derived(subjectName ? plannedSchulaufgabenFor(subjectName, cls.gradeLevel, cls.wpf) : null);

  const hoursSuggestion = $derived(subjectName ? weeklyHoursFor(subjectName, cls.gradeLevel, cls.wpf) : null);

  $effect(() => {
    if (!course && suggestion !== null) planned = suggestion;
  });
  $effect(() => {
    if (!course && hoursSuggestion !== null) hours = hoursSuggestion;
  });

  function pickSuggestion(s: { name: string; short: string }) {
    newSubject = s.name;
    newShort = s.short;
  }

  function save(e: Event) {
    e.preventDefault();
    let sid = subjectId;
    if (sid === '__new') {
      if (!newSubject.trim()) return;
      sid = addSubject(newSubject, newShort).id;
    }
    if (course) {
      updateCourse(cls, course, {
        subjectId: sid,
        weeklyHours: hours,
        promotionSubject: promotion,
        plannedSchulaufgaben: planned,
        testModel,
        excludedStudentIds: excluded,
      });
      toast.success('Unterricht gespeichert.');
    } else {
      const c = addCourse(cls, sid, hours, promotion);
      updateCourse(cls, c, { plannedSchulaufgaben: planned, testModel, excludedStudentIds: excluded });
      go(href.course(cls.id, c.id));
    }
    open = false;
  }

  function toggle(id: string) {
    excluded = excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id];
  }
</script>

<Modal bind:open title={course ? 'Unterricht bearbeiten' : `Fach für ${cls.name} hinzufügen`} width="max-w-xl">
  <form id="course-form" onsubmit={save} class="grid gap-4">
    <label>
      <span class="label">Fach</span>
      <select class="field" bind:value={subjectId}>
        {#each app.core.subjects as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
        <option value="__new">+ Neues Fach …</option>
      </select>
    </label>
    {#if subjectId === '__new'}
      <div class="grid grid-cols-[1fr_7rem] gap-3">
        <label><span class="label">Name des Fachs</span><input class="field" bind:value={newSubject} placeholder="z. B. Mathematik" /></label>
        <label><span class="label">Kürzel</span><input class="field" bind:value={newShort} placeholder="M" /></label>
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#each SUBJECT_SUGGESTIONS.filter((s) => !app.core.subjects.some((x) => x.name === s.name)) as s (s.name)}
          <button type="button" class="rounded-full border border-slate-200 px-2.5 py-1 text-[0.75rem] text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-line-dark dark:text-slate-300 dark:hover:bg-white/5" onclick={() => pickSuggestion(s)}>{s.name}</button>
        {/each}
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-3">
      <label><span class="label">Wochenstunden</span><input class="field" type="number" min="1" max="10" bind:value={hours} /></label>
      <label>
        <span class="label">Soll-Anzahl Schulaufgaben</span>
        <input class="field" type="number" min="0" max="6" bind:value={planned} disabled={testModel} />
      </label>
    </div>
    {#if hoursSuggestion !== null || (suggestion !== null && !testModel)}
      <p class="-mt-2 text-[0.75rem] text-slate-500">
        Für Jahrgangsstufe {cls.gradeLevel}{cls.wpf ? `, Gruppe ${cls.wpf}` : ''}:
        {#if hoursSuggestion !== null}<b>{hoursSuggestion}</b> Wochenstunden laut Stundentafel (RSO Anlage 1){/if}{#if hoursSuggestion !== null && suggestion !== null && !testModel}{', '}{/if}{#if suggestion !== null && !testModel}<b>{suggestion}</b> Schulaufgaben laut RSO § 18 Abs. 1{/if}
      </p>
    {/if}

    <div class="grid gap-2">
      <label class="flex items-center gap-2.5 text-[0.8125rem]"><input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={promotion} /> Vorrückungsfach</label>
      <label class="flex items-start gap-2.5 text-[0.8125rem]">
        <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" bind:checked={testModel} />
        <span>Schulaufgaben und Stegreifaufgaben durch angesagte Tests ersetzt <span class="text-slate-500">(Beschluss der Lehrerkonferenz, RSO § 18 Abs. 3)</span></span>
      </label>
    </div>

    {#if cls.students.length}
      <details class="rounded-xl border border-slate-200 dark:border-line-dark">
        <summary class="cursor-pointer px-4 py-2.5 text-[0.8125rem] font-medium">Teilnehmende ({cls.students.length - excluded.length} von {cls.students.length})</summary>
        <div class="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto border-t border-slate-100 px-4 py-3 dark:border-line-dark">
          {#each sortStudents(cls.students) as s (s.id)}
            <label class="flex items-center gap-2 text-[0.8125rem]">
              <input type="checkbox" class="h-4 w-4 accent-brand-600" checked={!excluded.includes(s.id)} onchange={() => toggle(s.id)} />
              {s.lastName}, {s.firstName}
            </label>
          {/each}
        </div>
      </details>
    {/if}
  </form>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Abbrechen</button>
    <button form="course-form" class="btn btn-primary">{course ? 'Speichern' : 'Hinzufügen'}</button>
  {/snippet}
</Modal>
