<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { entriesFor, formatAvg, halfOf, summarize, type Ctx } from '../../lib/domain/grading';
  import { activeStudents } from '../../lib/domain/rules';
  import { addSingleGrade, fmtShortDate, fromLocalInput, removeGrade, studentGradeRows, subjectOf, todayIso, typeById } from '../../lib/state/actions';
  import type { Course, GradeValue, SchoolClass, Student } from '../../lib/domain/types';
  import Modal from '../Modal.svelte';
  import Icon from '../Icon.svelte';
  import GradeBadge from '../GradeBadge.svelte';
  import { SUBJECT_GRADIENT } from '../colors';

  /**
   * „Noten erfassen“ für Einzelnoten (z. B. Rechenschaftsablage): erst Name
   * suchen, dann eine kompakte Karte mit den bisherigen Noten. Ein Klick auf
   * eine Ziffer speichert sofort; neue Noten lassen sich direkt zurücknehmen.
   */
  let { open = $bindable(false), classes, ctx }: { open?: boolean; classes: SchoolClass[]; ctx: Ctx } = $props();

  interface Hit {
    key: string;
    cls: SchoolClass;
    course: Course;
    student: Student;
  }

  let query = $state('');
  let active = $state(0);
  let picked = $state<Hit | null>(null);
  let typeId = $state(lastTypeId);
  let date = $state(todayIso());
  /** In dieser Sitzung angelegte Noten (zum Hervorheben und Zurücknehmen). */
  let added = $state<string[]>([]);
  let searchInput = $state<HTMLInputElement | null>(null);

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
      .sort((a, b) => a.student.lastName.localeCompare(b.student.lastName, 'de') || a.student.firstName.localeCompare(b.student.firstName, 'de') || a.cls.name.localeCompare(b.cls.name, 'de'))
      .slice(0, 8);
  });

  const types = $derived(app.core.types.filter((t) => !t.archived && t.category === 'klein'));

  const rows = $derived(picked ? studentGradeRows(picked.course, picked.student.id) : []);
  const avg = $derived(picked ? summarize(entriesFor(picked.course, picked.student.id, ctx, 'jahr')).total : null);
  const halves = $derived(new Set(rows.map((r) => halfOf(r.date, ctx.year))).size > 1);
  const subject = $derived(picked ? subjectOf(picked.course) : undefined);
  const tone = $derived(SUBJECT_GRADIENT[subject?.color ?? 'slate'] ?? SUBJECT_GRADIENT.slate);

  $effect(() => {
    if (open) {
      query = '';
      active = 0;
      picked = null;
      added = [];
      date = todayIso();
    }
  });

  $effect(() => {
    lastTypeId = typeId;
  });

  function pick(h: Hit) {
    picked = h;
    added = [];
  }

  function back() {
    picked = null;
    queueMicrotask(() => searchInput?.select());
  }

  function onsearchkey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, hits.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      pick(hits[active]);
    }
  }

  function save(value: GradeValue) {
    if (!picked) return;
    const performedAt = date === todayIso() ? new Date().toISOString() : fromLocalInput(`${date}T12:00`);
    const g = addSingleGrade(picked.cls, picked.course, picked.student.id, typeId, '', { value, performedAt });
    added = [...added, g.id];
  }

  function undo(id: string) {
    if (!picked) return;
    removeGrade(picked.cls, picked.course, id);
    added = added.filter((x) => x !== id);
  }

  /** Ziffern 1–6 speichern, solange kein Eingabefeld den Fokus hat. */
  function onkey(e: KeyboardEvent) {
    if (!open || !picked || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.closest('input, select, textarea')) return;
    if (/^[1-6]$/.test(e.key)) {
      e.preventDefault();
      save(Number(e.key) as GradeValue);
    }
  }

  const initials = (s: Student) => `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
</script>

<script module lang="ts">
  /** Zuletzt gewählte Art, bleibt beim nächsten Öffnen erhalten. */
  let lastTypeId = 'typ-rechenschaftsablage';
</script>

<svelte:window onkeydown={onkey} />

<Modal bind:open title={picked ? `Note für ${picked.student.firstName} ${picked.student.lastName}` : 'Noten erfassen'} width="max-w-md" bare>
  {#if !picked}
    <div class="flex items-center gap-2.5 px-4 py-3">
      <Icon name="search" size={17} class="text-slate-400" />
      <input
        bind:this={searchInput}
        bind:value={query}
        oninput={() => (active = 0)}
        onkeydown={onsearchkey}
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
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] transition {i === active
              ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
              : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}"
            onmouseenter={() => (active = i)}
            onclick={() => pick(h)}
          >
            <span class="flex-1 truncate font-medium">{h.student.lastName}, {h.student.firstName}</span>
            <span class="text-[0.75rem] {i === active ? '' : 'text-slate-500'}">{h.cls.name} · {s?.short}</span>
          </button>
        {:else}
          <p class="px-2.5 py-2 text-[0.8125rem] text-slate-500">Niemand gefunden.</p>
        {/each}
      </div>
    {/if}
  {:else}
    {@const st = picked.student}
    <div class="relative overflow-hidden rounded-t-card">
      <div class="absolute inset-0 bg-gradient-to-br {tone.bg}"></div>
      <div class="relative flex items-center gap-3 px-4 py-3.5">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-[0.8125rem] font-semibold shadow-soft dark:bg-white/10 {tone.text}">{initials(st)}</span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[0.9375rem] font-semibold text-slate-900 dark:text-white">{st.lastName}, {st.firstName}</div>
          <div class="text-[0.75rem] text-slate-500">{picked.cls.name} · {subject?.name}</div>
        </div>
        <div class="text-right">
          {#key avg}<div class="animate-pop text-[1.375rem] font-semibold leading-tight tabular-nums text-slate-900 dark:text-white">{formatAvg(avg)}</div>{/key}
          <div class="text-[0.6875rem] text-slate-500">Schnitt</div>
        </div>
        <button type="button" class="btn btn-ghost -mr-1.5 h-8 w-8 self-start px-0" onclick={() => (open = false)} aria-label="Schließen"><Icon name="x" size={16} /></button>
      </div>
    </div>

    <div class="flex min-h-14 flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-3 dark:border-line-dark">
      {#each rows as r, i (r.g.id)}
        {@const isNew = added.includes(r.g.id)}
        {@const h = halfOf(r.date, ctx.year)}
        {#if halves && (i === 0 || halfOf(rows[i - 1].date, ctx.year) !== h)}
          <span class="mr-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 {i ? 'ml-1.5' : ''}">{h}. Hj.</span>
        {/if}
        <span
          class="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2.5 text-[0.75rem] ring-1 ring-inset {isNew
            ? 'animate-pop bg-emerald-50 pr-1 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30'
            : 'bg-slate-50 pr-0.5 text-slate-600 ring-slate-200/80 dark:bg-white/[0.03] dark:text-slate-300 dark:ring-line-dark'}"
          title="{r.name} · {fmtShortDate(r.date)}{r.weight !== 1 ? ` · ${String(r.weight).replace('.', ',')}-fach` : ''}"
        >
          {typeById(r.g.assessmentId ? picked.course.assessments.find((a) => a.id === r.g.assessmentId)?.typeId : r.g.typeId)?.short ?? '?'}
          <GradeBadge value={r.g.value} status={r.g.status} size="sm" />
          {#if isNew}
            <button type="button" class="grid h-5 w-5 place-items-center rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-500/20" onclick={() => undo(r.g.id)} title="Zurücknehmen" aria-label="Note zurücknehmen">
              <Icon name="x" size={12} stroke={2} />
            </button>
          {/if}
        </span>
      {:else}
        <span class="text-[0.8125rem] text-slate-400">Noch keine Noten in diesem Fach.</span>
      {/each}
    </div>

    <div class="rounded-b-card border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-line-dark dark:bg-white/[0.02]">
      <div class="mb-2.5 flex gap-2">
        <select class="field h-9 flex-1" bind:value={typeId} aria-label="Art der Note">
          {#each types as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
        <input class="field h-9 w-36" type="date" bind:value={date} max={todayIso()} aria-label="Datum der Leistung" />
      </div>
      <div class="flex items-center gap-1.5">
        {#each [1, 2, 3, 4, 5, 6] as v (v)}
          <button
            type="button"
            class="h-10 w-10 rounded-xl text-[1rem] font-semibold tabular-nums ring-1 ring-inset ring-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:shadow-soft active:scale-95 dark:bg-panel-dark dark:text-slate-200 dark:ring-line-dark"
            onclick={() => save(v as GradeValue)}
          >{v}</button>
        {/each}
        <span class="ml-1.5 text-[0.6875rem] leading-tight text-slate-400">Klick oder Taste 1–6<br />speichert sofort</span>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <button type="button" class="btn btn-ghost -ml-2 h-7 px-2 text-[0.75rem]" onclick={back}><Icon name="back" size={14} /> Anderer Schüler</button>
        {#if added.length}<span class="text-[0.75rem] text-emerald-600 dark:text-emerald-400">{added.length} Note{added.length === 1 ? '' : 'n'} gespeichert</span>{/if}
      </div>
    </div>
  {/if}
</Modal>
