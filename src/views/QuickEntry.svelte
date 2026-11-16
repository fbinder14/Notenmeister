<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { addSingleGrade, courseStudents, findClass, findCourse, fromLocalInput, subjectOf, toLocalInput } from '../lib/state/actions';
  import { go, href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { GradeValue } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import { GRADE_CLASS } from '../ui/colors';

  let { classId, courseId }: { classId: string; courseId: string } = $props();
  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const students = $derived(cls && course ? courseStudents(cls, course).filter((s) => !s.leftAt) : []);

  const types = $derived(app.core.types.filter((t) => !t.archived && t.category === 'klein'));
  let typeId = $state('typ-unterrichtsbeitrag');
  let title = $state('');
  let when = $state(toLocalInput(new Date().toISOString()));
  let weight = $state<number | null>(null);
  let values = $state<Record<string, GradeValue | undefined>>({});
  let comments = $state<Record<string, string>>({});

  const type = $derived(app.core.types.find((t) => t.id === typeId));
  const count = $derived(Object.values(values).filter(Boolean).length);

  function focusRow(i: number) {
    document.querySelector<HTMLInputElement>(`[data-quick="${i}"]`)?.focus();
  }

  function onkey(e: KeyboardEvent, id: string, i: number) {
    if (/^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      values[id] = Number(e.key) as GradeValue;
      focusRow(i + 1);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      values[id] = undefined;
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      focusRow(i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusRow(i - 1);
    }
  }

  function save() {
    if (!cls || !course || !count) return;
    const performedAt = fromLocalInput(when);
    const w = weight === null || Number.isNaN(weight) || weight === type?.weight ? null : weight;
    for (const s of students) {
      const v = values[s.id];
      if (v) addSingleGrade(cls, course, s.id, typeId, title, { value: v, comment: comments[s.id]?.trim() ?? '', performedAt }, w);
    }
    toast.success(`${count} Note${count === 1 ? '' : 'n'} gespeichert.`);
    go(href.course(cls.id, course.id));
  }
</script>

{#if !cls || !course}
  <div class="p-8"><Empty icon="book" title="Unterricht nicht gefunden" /></div>
{:else}
  <PageHeader title="Noten für mehrere erfassen" eyebrow="{cls.name} · {subjectOf(course)?.name}" back={href.course(cls.id, course.id)}>
    {#snippet actions()}
      <button class="btn btn-primary" disabled={!count} onclick={save}><Icon name="check" size={15} /> {count} speichern</button>
    {/snippet}
  </PageHeader>

  <div class="mx-auto grid max-w-4xl gap-5 px-8 py-7">
    <div class="card grid gap-3 p-5 sm:grid-cols-[1.3fr_1fr_1fr_6rem]">
      <label>
        <span class="label">Art</span>
        <select class="field" bind:value={typeId}>
          {#each types as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
      </label>
      <label><span class="label">Thema</span><input class="field" bind:value={title} placeholder="optional" /></label>
      <label><span class="label">Datum und Uhrzeit</span><input class="field" type="datetime-local" bind:value={when} /></label>
      <label><span class="label">Gewicht</span><input class="field" type="number" min="0" step="0.5" bind:value={weight} placeholder={String(type?.weight ?? 1)} /></label>
    </div>

    <p class="flex items-center gap-2 text-[0.78125rem] text-slate-500">
      <Icon name="zap" size={14} class="text-brand-500" /> Zeile anklicken, Ziffer <span class="kbd">1</span>–<span class="kbd">6</span> tippen – es geht automatisch weiter. Leere Zeilen werden übersprungen.
    </p>

    <div class="card divide-y divide-slate-100 overflow-hidden dark:divide-line-dark">
      {#each students as s, i (s.id)}
        <div class="group relative flex items-center gap-3 px-4 py-2 transition focus-within:bg-brand-50/60 hover:bg-slate-50 dark:focus-within:bg-brand-500/10 dark:hover:bg-white/[0.02]">
          <input
            data-quick={i}
            readonly
            class="absolute h-0 w-0 opacity-0"
            onkeydown={(e) => onkey(e, s.id, i)}
            aria-label="Note für {s.firstName} {s.lastName}"
          />
          <button class="w-56 truncate text-left text-[0.8125rem] font-medium" onclick={() => focusRow(i)}>{s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span></button>
          <div class="flex gap-1">
            {#each [1, 2, 3, 4, 5, 6] as v (v)}
              <button
                class="h-8 w-8 rounded-lg text-[0.8125rem] font-semibold ring-1 ring-inset transition active:scale-90 {values[s.id] === v
                  ? `${GRADE_CLASS[v]} scale-105 shadow-soft`
                  : 'text-slate-400 ring-slate-200 hover:text-slate-700 hover:ring-slate-300 dark:ring-line-dark dark:hover:text-slate-200'}"
                onclick={() => {
                  values[s.id] = values[s.id] === v ? undefined : (v as GradeValue);
                  focusRow(i);
                }}>{v}</button
              >
            {/each}
          </div>
          <input
            class="field h-8 flex-1 text-[0.78125rem]"
            placeholder="Bemerkung"
            bind:value={comments[s.id]}
            disabled={!values[s.id]}
          />
        </div>
      {/each}
    </div>
  </div>
{/if}
