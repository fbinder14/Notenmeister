<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { app } from '../lib/state/app.svelte';
  import { addCourse, addSubject, sortStudents, updateCourse, updateSubject } from '../lib/state/actions';
  import { isSportName, sportGroupFromName, SPORT_GROUP_LABEL } from '../lib/domain/sport';
  import type { SportGroup } from '../lib/domain/types';
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
  /** Sport: Wertungstabelle des Fachs (gilt für alle Klassen mit diesem Fach). */
  let group = $state<SportGroup | ''>('');

  $effect(() => {
    if (!open) return;
    // Neues Fach: kein Fach vorschlagen, das die Klasse schon hat.
    const taken = new Set(cls.courses.map((c) => c.subjectId));
    subjectId = course?.subjectId ?? app.core.subjects.find((x) => !taken.has(x.id))?.id ?? '__new';
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
  const sport = $derived(isSportName(subjectName) || (subjectId !== '__new' && app.core.subjects.find((s) => s.id === subjectId)?.sport !== undefined));

  // Sport: kein Vorrückungsfach (RSO § 25 Abs. 1), Wertungstabelle aus dem Fach bzw. Namen.
  $effect(() => {
    if (!course) promotion = !sport;
  });
  $effect(() => {
    const s = app.core.subjects.find((x) => x.id === subjectId);
    group = (s ? s.sport : sportGroupFromName(newSubject)) ?? '';
  });

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
    if (sport) {
      const s = app.core.subjects.find((x) => x.id === sid);
      if (s && (s.sport ?? '') !== group) updateSubject(sid, { sport: group || undefined });
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
        {#each app.core.subjects as s (s.id)}<option value={s.id}>{s.name}{!course && cls.courses.some((c) => c.subjectId === s.id) ? ' (bereits angelegt)' : ''}</option>{/each}
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

    {#if sport}
      <div>
        <span class="label">Wertungstabelle</span>
        <div class="flex gap-1.5">
          {#each [['m', SPORT_GROUP_LABEL.m], ['w', SPORT_GROUP_LABEL.w], ['', 'ohne Tabelle']] as [v, l] (v)}
            <button type="button" class="btn h-8 flex-1 {group === v ? 'btn-primary' : 'btn-soft'}" onclick={() => (group = v as SportGroup | '')}>{l}</button>
          {/each}
        </div>
        <p class="mt-1.5 text-[0.75rem] text-slate-500">Für Messwerte (Zeiten, Weiten, Höhen) schlägt der Notenmeister die Grenzen aus den ISB-Orientierungstabellen vor. Gilt für alle Klassen mit diesem Fach.</p>
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-3">
      <label class={sport ? 'col-span-2' : ''}><span class="label">Wochenstunden</span><input class="field" type="number" min="1" max="10" bind:value={hours} /></label>
      {#if !sport}
      <label>
        <span class="label">Soll-Anzahl Schulaufgaben</span>
        <input class="field" type="number" min="0" max="6" bind:value={planned} disabled={testModel} />
      </label>
      {/if}
    </div>
    {#if hoursSuggestion !== null || (suggestion !== null && !testModel)}
      <p class="-mt-2 text-[0.75rem] text-slate-500">
        Für Jahrgangsstufe {cls.gradeLevel}{cls.wpf ? `, Gruppe ${cls.wpf}` : ''}:
        {#if hoursSuggestion !== null}<b>{hoursSuggestion}</b> Wochenstunden laut Stundentafel (RSO Anlage 1){/if}{#if hoursSuggestion !== null && suggestion !== null && !testModel}{', '}{/if}{#if suggestion !== null && !testModel}<b>{suggestion}</b> Schulaufgaben laut RSO § 18 Abs. 1{/if}
      </p>
    {/if}

    <div class="grid gap-2">
      <label class="flex items-center gap-2.5 text-[0.8125rem]"><input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={promotion} /> Vorrückungsfach</label>
      {#if sport}
        <p class="text-[0.75rem] text-slate-500">Sport: keine Schulaufgaben; je Halbjahr mindestens zwei praktische Leistungsnachweise (RSO § 19 Abs. 5, 6), empfohlen aus zwei Handlungsfeldern. Vorrückungsfach nur, wenn das an deiner Schule so gilt.</p>
      {:else}
      <label class="flex items-start gap-2.5 text-[0.8125rem]">
        <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" bind:checked={testModel} />
        <span>Schulaufgaben und Stegreifaufgaben durch angesagte Tests ersetzt <span class="text-slate-500">(Beschluss der Lehrerkonferenz, RSO § 18 Abs. 3)</span></span>
      </label>
      {/if}
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
