<script lang="ts">
  import { gradeFromPoints } from '../lib/domain/gradeKey';
  import type { Assessment, Grade, GradeKey, GradeValue } from '../lib/domain/types';
  import GradeBadge from './GradeBadge.svelte';
  import { GRADE_CLASS } from './colors';

  /**
   * Eingabezelle im Notenbuch. Ziffern 1–6 (bzw. Punkte) eintippen,
   * ↵ oder ↓ springt zur nächsten Zeile, ↑ zur vorherigen, Entf löscht.
   */
  let {
    grade,
    assessment,
    gradeKey,
    row,
    col,
    oncommit,
    onopen,
  }: {
    grade: Grade | undefined;
    assessment: Assessment;
    gradeKey: GradeKey;
    row: number;
    col: number;
    oncommit: (input: { value: GradeValue | null; points: number | null }) => void;
    onopen: () => void;
  } = $props();

  const pointsMode = $derived(!!assessment.maxPoints);
  const special = $derived(!!grade && grade.status !== 'gewertet');
  const shown = $derived(
    !grade ? '' : pointsMode ? (grade.points != null ? String(grade.points).replace('.', ',') : '') : grade.value != null ? String(grade.value) : '',
  );

  let text = $state('');
  let focused = $state(false);
  let bad = $state(false);
  let popKey = $state(0);

  $effect(() => {
    if (!focused) text = shown;
  });

  function move(delta: number) {
    const el = document.querySelector<HTMLInputElement>(`[data-cell="${row + delta}-${col}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  }

  function commit(): boolean {
    const raw = text.trim().replace(',', '.');
    if (raw === shown.replace(',', '.')) return true;
    if (raw === '') {
      oncommit({ value: null, points: null });
      return true;
    }
    if (pointsMode) {
      const p = Number(raw);
      if (!Number.isFinite(p) || p < 0 || p > assessment.maxPoints!) return fail();
      oncommit({ value: gradeFromPoints(p, assessment.maxPoints!, gradeKey), points: p });
    } else {
      if (!/^[1-6]$/.test(raw)) return fail();
      oncommit({ value: Number(raw) as GradeValue, points: null });
    }
    popKey++;
    return true;
  }

  function fail(): boolean {
    bad = true;
    setTimeout(() => (bad = false), 450);
    text = shown;
    return false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (commit()) move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commit()) move(-1);
    } else if (e.key === 'Escape') {
      text = shown;
      (e.target as HTMLInputElement).blur();
    } else if (!pointsMode && /^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      // Eine Ziffer genügt: sofort übernehmen und weiter.
      e.preventDefault();
      text = e.key;
      if (commit()) move(1);
    }
  }
</script>

{#if special && grade}
  <button type="button" class="mx-auto flex h-8 w-full items-center justify-center rounded-lg transition hover:bg-slate-900/5 dark:hover:bg-white/5" onclick={onopen} title={grade.comment || 'Status bearbeiten'}>
    <GradeBadge value={grade.value} status={grade.status} />
  </button>
{:else}
  <div class="relative flex items-center justify-center gap-1">
    {#key popKey}
      <input
        data-cell="{row}-{col}"
        class="h-8 w-full min-w-10 rounded-lg border-0 bg-transparent text-center text-[13.5px] font-semibold tabular-nums outline-none ring-1 ring-inset ring-transparent transition placeholder:text-slate-300 hover:ring-slate-200 focus:bg-white focus:shadow-glow focus:ring-brand-400 dark:placeholder:text-slate-600 dark:hover:ring-line-dark dark:focus:bg-white/10
          {!focused && grade?.value && !pointsMode ? GRADE_CLASS[grade.value] : ''}
          {popKey && !focused ? 'animate-pop' : ''}
          {bad ? 'animate-shake ring-rose-400!' : ''}"
        inputmode="decimal"
        autocomplete="off"
        placeholder="·"
        bind:value={text}
        onfocus={(e) => {
          focused = true;
          (e.target as HTMLInputElement).select();
        }}
        onblur={() => {
          commit();
          focused = false;
        }}
        {onkeydown}
        ondblclick={onopen}
        aria-label="Note"
      />
    {/key}
    {#if pointsMode && grade?.value && !focused}
      <span class="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2"><GradeBadge value={grade.value} size="sm" /></span>
    {/if}
  </div>
{/if}
