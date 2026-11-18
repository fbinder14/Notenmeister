<script module lang="ts">
  import type { Course, SchoolClass, Student } from '../../lib/domain/types';

  /** Treffer der Schülersuche: eine Person in einem Fach. */
  export interface StudentHit {
    key: string;
    cls: SchoolClass;
    course: Course;
    student: Student;
  }
</script>

<script lang="ts">
  import { activeStudents } from '../../lib/domain/rules';
  import { subjectOf } from '../../lib/state/actions';
  import Icon from '../Icon.svelte';

  /**
   * Suchfeld mit Trefferliste für die Schnellzugriffe der Startseite. Jede
   * Kombination aus Schüler und Fach ist ein eigener Treffer. Pfeiltasten
   * wählen, Enter übernimmt. `note` liefert einen optionalen Zusatz je Treffer.
   */
  let {
    classes,
    onpick,
    query = $bindable(''),
    note,
  }: {
    classes: SchoolClass[];
    onpick: (hit: StudentHit) => void;
    query?: string;
    note?: (hit: StudentHit) => string | undefined;
  } = $props();

  let active = $state(0);

  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

  const all = $derived(
    classes.flatMap((cls) =>
      cls.courses.flatMap((course) => activeStudents(cls, course).map((student) => ({ key: `${course.id}/${student.id}`, cls, course, student }))),
    ),
  );
  const hits = $derived.by(() => {
    const tokens = norm(query).split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return [];
    return all
      .filter((h) => {
        const name = norm(`${h.student.lastName} ${h.student.firstName}`);
        return tokens.every((t) => name.includes(t));
      })
      .sort(
        (a, b) =>
          a.student.lastName.localeCompare(b.student.lastName, 'de') ||
          a.student.firstName.localeCompare(b.student.firstName, 'de') ||
          a.cls.name.localeCompare(b.cls.name, 'de'),
      )
      .slice(0, 8);
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, hits.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      onpick(hits[active]);
    }
  }

  /** Fokus beim Erscheinen; ein vorhandener Suchbegriff wird markiert. */
  function focusOnMount(node: HTMLInputElement) {
    queueMicrotask(() => node.select());
  }
</script>

<div class="flex items-center gap-2.5 px-4 py-3">
  <Icon name="search" size={17} class="text-slate-400" />
  <input
    use:focusOnMount
    bind:value={query}
    oninput={() => (active = 0)}
    {onkeydown}
    class="h-8 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-slate-400"
    placeholder="Name der Schülerin oder des Schülers"
    aria-label="Schülerin oder Schüler suchen"
    autocomplete="off"
  />
  <kbd class="rounded border border-slate-200 px-1.5 text-[0.6875rem] text-slate-400 dark:border-line-dark">↵</kbd>
</div>
{#if query.trim()}
  <div class="border-t border-slate-100 p-1.5 dark:border-line-dark" role="listbox" aria-label="Treffer">
    {#each hits as h, i (h.key)}
      {@const s = subjectOf(h.course)}
      {@const extra = note?.(h)}
      <button
        type="button"
        role="option"
        aria-selected={i === active}
        class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] transition {i === active
          ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
          : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}"
        onmouseenter={() => (active = i)}
        onclick={() => onpick(h)}
      >
        <span class="flex-1 truncate font-medium">{h.student.lastName}, {h.student.firstName}</span>
        {#if extra}<span class="rounded-full bg-brand-100/70 px-2 py-0.5 text-[0.6875rem] text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{extra}</span>{/if}
        <span class="text-[0.75rem] {i === active ? '' : 'text-slate-500'}">{h.cls.name} · {s?.short}</span>
      </button>
    {:else}
      <p class="px-2.5 py-2 text-[0.8125rem] text-slate-500">Niemand gefunden.</p>
    {/each}
  </div>
{/if}
