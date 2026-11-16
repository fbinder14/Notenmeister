<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { addSingleGrade, courseStudents, findClass, findCourse, fmtShortDate, fromLocalInput, subjectOf, todayIso, yearOf } from '../lib/state/actions';
  import { formatAvg, halfOf, weightedAverage } from '../lib/domain/grading';
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
  let typeId = $state('typ-rechenschaftsablage');
  let title = $state('');
  /** Leer: jede Note bekommt den Zeitpunkt, zu dem sie eingetippt wurde. */
  let when = $state('');
  /** Zeitpunkt der Eingabe je Schüler – wird zum Erfassungszeitpunkt der Note. */
  let typedAt: Record<string, string> = {};

  function setValue(id: string, v: GradeValue | undefined) {
    if (v === values[id]) return;
    values[id] = v;
    if (v) typedAt[id] = new Date().toISOString();
    else delete typedAt[id];
  }
  let weight = $state<number | null>(null);
  let values = $state<Record<string, GradeValue | undefined>>({});
  let comments = $state<Record<string, string>>({});

  const type = $derived(app.core.types.find((t) => t.id === typeId));
  const count = $derived(Object.values(values).filter(Boolean).length);

  /** Bisherige Noten der gewählten Art im Halbjahr des gewählten Datums – wer wurde schon abgefragt? */
  const year = $derived(cls ? yearOf(cls) : undefined);
  const half = $derived(year ? halfOf((when || todayIso()).slice(0, 10), year) : null);
  const prior = $derived.by(() => {
    const m = new Map<string, { n: number; last: string }>();
    const vals: { value: number; weight: number }[] = [];
    if (!course || !year || !half) return { m, avg: '–', total: 0 };
    let total = 0;
    for (const g of course.grades) {
      if (g.assessmentId || g.typeId !== typeId || halfOf(g.performedAt.slice(0, 10), year) !== half) continue;
      const e = m.get(g.studentId) ?? { n: 0, last: '' };
      e.n++;
      if (g.performedAt > e.last) e.last = g.performedAt;
      m.set(g.studentId, e);
      total++;
      if (g.value !== null && g.status !== 'nicht_gewertet' && g.status !== 'nachtermin') vals.push({ value: g.value, weight: 1 });
    }
    return { m, avg: formatAvg(weightedAverage(vals)), total };
  });
  const reached = $derived(students.filter((s) => prior.m.has(s.id)).length);

  function focusRow(i: number) {
    document.querySelector<HTMLInputElement>(`[data-quick="${i}"]`)?.focus();
  }

  function onkey(e: KeyboardEvent, id: string, i: number) {
    if (/^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      setValue(id, Number(e.key) as GradeValue);
      focusRow(i + 1);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setValue(id, undefined);
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
    const fixed = when ? fromLocalInput(when) : null;
    const w = weight === null || Number.isNaN(weight) || weight === type?.weight ? null : weight;
    for (const s of students) {
      const v = values[s.id];
      if (!v) continue;
      const at = typedAt[s.id] ?? new Date().toISOString();
      addSingleGrade(cls, course, s.id, typeId, title, { value: v, comment: comments[s.id]?.trim() ?? '', performedAt: fixed ?? at, recordedAt: at }, w);
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
      <label>
        <span class="label">Datum und Uhrzeit</span>
        <input class="field" type="datetime-local" bind:value={when} />
        <span class="mt-1 block text-[0.6875rem] text-slate-400">{when ? 'gilt für alle Noten dieser Eingabe' : 'leer: Zeitpunkt der jeweiligen Eingabe'}</span>
      </label>
      <label><span class="label">Gewicht</span><input class="field" type="number" min="0" step="0.5" bind:value={weight} placeholder={String(type?.weight ?? 1)} /></label>
    </div>

    <div class="card grid grid-cols-3 divide-x divide-slate-100 text-center dark:divide-line-dark">
      <div class="p-3">
        <div class="text-[0.6875rem] text-slate-500">Bereits bewertet ({half}. Halbjahr)</div>
        <div class="text-[1.25rem] font-semibold tabular-nums text-slate-900 dark:text-white">{reached}<span class="text-[0.875rem] font-normal text-slate-400"> / {students.length}</span></div>
      </div>
      <div class="p-3">
        <div class="text-[0.6875rem] text-slate-500">Noten „{type?.short}“ bisher</div>
        <div class="text-[1.25rem] font-semibold tabular-nums text-slate-900 dark:text-white">{prior.total}</div>
      </div>
      <div class="p-3">
        <div class="text-[0.6875rem] text-slate-500">Schnitt bisher</div>
        <div class="text-[1.25rem] font-semibold tabular-nums text-slate-900 dark:text-white">{prior.avg}</div>
      </div>
    </div>

    <p class="flex items-center gap-2 text-[0.78125rem] text-slate-500">
      <Icon name="zap" size={14} class="text-brand-500" /> Zeile anklicken, Ziffer <span class="kbd">1</span>–<span class="kbd">6</span> tippen – es geht automatisch weiter. Leere Zeilen werden übersprungen.
    </p>

    <div class="card divide-y divide-slate-100 overflow-hidden dark:divide-line-dark">
      {#each students as s, i (s.id)}
        {@const p = prior.m.get(s.id)}
        <div class="group relative flex items-center gap-3 px-4 py-2 transition focus-within:bg-brand-50/60 hover:bg-slate-50 dark:focus-within:bg-brand-500/10 dark:hover:bg-white/[0.02]">
          <input
            data-quick={i}
            readonly
            class="absolute h-0 w-0 opacity-0"
            onkeydown={(e) => onkey(e, s.id, i)}
            aria-label="Note für {s.firstName} {s.lastName}"
          />
          <button class="w-56 truncate text-left text-[0.8125rem] font-medium" onclick={() => focusRow(i)}>{s.lastName}, <span class="font-normal text-slate-500">{s.firstName}</span></button>
          <span
            class="w-20 shrink-0 text-[0.6875rem] tabular-nums {p ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}"
            title={p ? `${p.n}× „${type?.name}“ in diesem Halbjahr, zuletzt am ${fmtShortDate(p.last.slice(0, 10))}` : `In diesem Halbjahr noch keine Note „${type?.name}“`}
          >{p ? `✓ ${p.n}× · ${fmtShortDate(p.last.slice(0, 10))}` : 'noch nicht'}</span>
          <div class="flex gap-1">
            {#each [1, 2, 3, 4, 5, 6] as v (v)}
              <button
                class="h-8 w-8 rounded-lg text-[0.8125rem] font-semibold ring-1 ring-inset transition active:scale-90 {values[s.id] === v
                  ? `${GRADE_CLASS[v]} scale-105 shadow-soft`
                  : 'text-slate-400 ring-slate-200 hover:text-slate-700 hover:ring-slate-300 dark:ring-line-dark dark:hover:text-slate-200'}"
                onclick={() => {
                  setValue(s.id, values[s.id] === v ? undefined : (v as GradeValue));
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
