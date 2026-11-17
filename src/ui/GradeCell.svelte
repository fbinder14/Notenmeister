<script lang="ts">
  import { gradeFromPoints } from '../lib/domain/gradeKey';
  import { needsReplacement } from '../lib/domain/grading';
  import { ABSENT_COMMENT, allowsMakeup, typeById } from '../lib/state/actions';
  import type { Assessment, Grade, GradeKey, GradeStatus, GradeValue } from '../lib/domain/types';
  import GradeBadge from './GradeBadge.svelte';
  import { GRADE_CLASS } from './colors';

  /**
   * Eingabezelle im Notenbuch. Ziffern 1–6 (bzw. Punkte) eintippen,
   * ↵ oder ↓ springt zur nächsten Zeile, ↑ zur vorherigen, Entf löscht.
   * X trägt „nicht teilgenommen“ ein: bei nachzuholenden Nachweisen als
   * Nachtermin (RSO § 22), sonst als nicht gewertet.
   */
  let {
    grade,
    assessment,
    gradeKey,
    row,
    col,
    oncommit,
    onopen,
    replacedBy = '',
  }: {
    grade: Grade | undefined;
    assessment: Assessment;
    gradeKey: GradeKey;
    row: number;
    col: number;
    oncommit: (input: { value: GradeValue | null; points: number | null; status?: GradeStatus; comment?: string }) => void;
    onopen: () => void;
    /** Bei versäumtem Nachweis: Kurzbeschreibung der Ersatznote, leer solange sie fehlt. */
    replacedBy?: string;
  } = $props();

  const absent = $derived(needsReplacement(grade));

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

  /** Bemerkung „nicht teilgenommen“ beim Überschreiben mit einer Note wieder entfernen. */
  const clearAbsent = $derived(grade?.comment === ABSENT_COMMENT ? { comment: '' } : {});

  function move(delta: number) {
    const el = document.querySelector<HTMLElement>(`[data-cell="${row + delta}-${col}"]`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }

  function markAbsent() {
    const status: GradeStatus = allowsMakeup(typeById(assessment.typeId)) ? 'nachtermin' : 'nicht_gewertet';
    oncommit({ value: null, points: null, status, comment: grade?.comment || ABSENT_COMMENT });
    popKey++;
  }

  /** Tastatur auf einer Zelle mit Sonderstatus (NT, nicht gewertet …). */
  function onspecialkey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      oncommit({ value: null, points: null });
    } else if (!pointsMode && /^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      oncommit({ value: Number(e.key) as GradeValue, points: null, status: 'gewertet', ...clearAbsent });
      move(1);
    }
  }

  function commit(): boolean {
    const raw = text.trim().replace(',', '.');
    if (raw === shown.replace(',', '.')) return true;
    if (/^x$/i.test(raw)) {
      markAbsent();
      return true;
    }
    if (raw === '') {
      oncommit({ value: null, points: null });
      return true;
    }
    if (pointsMode) {
      const p = Number(raw);
      if (!Number.isFinite(p) || p < 0 || p > assessment.maxPoints!) return fail();
      oncommit({ value: gradeFromPoints(p, assessment.maxPoints!, gradeKey), points: p, ...clearAbsent });
    } else {
      if (!/^[1-6]$/.test(raw)) return fail();
      oncommit({ value: Number(raw) as GradeValue, points: null, ...clearAbsent });
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
    } else if ((e.key === 'x' || e.key === 'X') && !e.metaKey && !e.ctrlKey) {
      // X = nicht teilgenommen, sofort übernehmen und weiter.
      e.preventDefault();
      text = '';
      markAbsent();
      move(1);
    }
  }
</script>

{#if special && grade}
  <button
    type="button"
    data-cell="{row}-{col}"
    class="mx-auto flex h-8 w-full items-center justify-center rounded-lg outline-none ring-1 ring-inset ring-transparent transition hover:bg-slate-900/5 focus:ring-brand-400 dark:hover:bg-white/5"
    onclick={onopen}
    onkeydown={onspecialkey}
    title={absent
      ? `Gefehlt – ${replacedBy ? `ersetzt durch ${replacedBy}` : 'Ersatznote offen'}${grade.comment && grade.comment !== ABSENT_COMMENT ? `\n${grade.comment}` : ''}`
      : grade.comment || 'Status bearbeiten'}
  >
    {#if absent}
      <span class="hatch inline-block h-7 w-9 rounded-lg ring-1 ring-inset {replacedBy ? 'opacity-50 ring-slate-200 dark:ring-line-dark' : 'ring-slate-300 dark:ring-white/15'}" aria-label="gefehlt"></span>
    {:else}
      <GradeBadge value={grade.value} status={grade.status} />
    {/if}
  </button>
{:else}
  <div class="relative flex items-center justify-center gap-1">
    {#key popKey}
      <input
        data-cell="{row}-{col}"
        class="h-8 w-full min-w-10 rounded-lg border-0 bg-transparent text-center text-[0.84375rem] font-semibold tabular-nums outline-none ring-1 ring-inset ring-transparent transition placeholder:text-slate-300 hover:ring-slate-200 focus:bg-white focus:shadow-glow focus:ring-brand-400 dark:placeholder:text-slate-600 dark:hover:ring-line-dark dark:focus:bg-white/10
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
