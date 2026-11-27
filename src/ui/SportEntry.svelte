<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { ABSENT_COMMENT, allowsMakeup, setAssessmentGrade, setSportResult, STATUS_LABEL, typeById } from '../lib/state/actions';
  import { bestOf, formatMeasure, parseMeasure, sportOutcome, UNIT_HINT, UNIT_PLACEHOLDER, unitSuffix } from '../lib/domain/sport';
  import type { Assessment, Course, Grade, GradeValue, SchoolClass, SportPart, SportResult, Student } from '../lib/domain/types';
  import GradeBadge from './GradeBadge.svelte';
  import Icon from './Icon.svelte';

  /**
   * Erfassung eines Sport-Nachweises: je Schülerin und Schüler die Versuche jedes
   * Messwerts und die Teilnoten; die Note wird laufend berechnet. ↵ springt zur
   * nächsten Zeile, Tab zum nächsten Feld, X = nicht teilgenommen.
   */
  let {
    cls,
    course,
    assessment,
    students,
    grades,
    onopen,
  }: {
    cls: SchoolClass;
    course: Course;
    assessment: Assessment;
    students: Student[];
    grades: Map<string, Grade>;
    onopen: (s: Student) => void;
  } = $props();

  const spec = $derived(assessment.sport!);
  const rounding = $derived(app.core.settings.rounding);
  const makeup = $derived(allowsMakeup(typeById(assessment.typeId)));

  /** Spalten aller Eingabefelder einer Zeile (für die Tastaturführung). */
  type Slot = { part: SportPart; key: 'value' | 'attempts' | 'entry'; i: number };
  const slots = $derived.by(() => {
    const out: Slot[] = [];
    for (const p of spec.parts) {
      if (p.kind === 'note') out.push({ part: p, key: 'value', i: 0 });
      else {
        if (p.kind === 'fortschritt') for (let i = 0; i < p.attempts; i++) out.push({ part: p, key: 'entry', i });
        for (let i = 0; i < p.attempts; i++) out.push({ part: p, key: 'attempts', i });
      }
    }
    return out;
  });
  const colOf = (s: Slot) => slots.findIndex((x) => x.part.id === s.part.id && x.key === s.key && x.i === s.i);

  function result(g: Grade | undefined): SportResult {
    return g?.sport ? $state.snapshot(g.sport) : { parts: {} };
  }

  function shown(g: Grade | undefined, s: Slot): string {
    const r = g?.sport?.parts[s.part.id];
    if (!r) return '';
    if (s.key === 'value') return r.value ? String(r.value) : '';
    const v = r[s.key]?.[s.i];
    return s.part.kind === 'note' ? '' : formatMeasure(v, s.part.unit);
  }

  function isBest(g: Grade | undefined, s: Slot): boolean {
    if (s.part.kind === 'note' || s.key === 'value') return false;
    const list = g?.sport?.parts[s.part.id]?.[s.key];
    const b = bestOf(list, s.part.better);
    return b !== null && (list?.filter((x) => x != null).length ?? 0) > 1 && list?.[s.i] === b;
  }

  function move(row: number, col: number) {
    const el = document.querySelector<HTMLInputElement>(`[data-sport="${row}-${col}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  }

  function shake(el: HTMLInputElement, prev: string) {
    el.value = prev;
    el.classList.add('animate-shake', 'ring-rose-400!');
    setTimeout(() => el.classList.remove('animate-shake', 'ring-rose-400!'), 450);
  }

  /** Übernimmt eine Eingabe; liefert false bei ungültigem Wert. */
  function commit(st: Student, s: Slot, el: HTMLInputElement): boolean {
    const g = grades.get(st.id);
    const prev = shown(g, s);
    const text = el.value.trim();
    if (text === prev) return true;
    if (/^x$/i.test(text)) {
      markAbsent(st);
      el.value = '';
      return true;
    }
    const r = result(g);
    const pr = (r.parts[s.part.id] ??= {});
    if (s.key === 'value') {
      if (text && !/^[1-6]$/.test(text)) return (shake(el, prev), false);
      if (text) pr.value = Number(text) as GradeValue;
      else delete pr.value;
    } else if (s.part.kind !== 'note') {
      const v = text ? parseMeasure(text, s.part.unit) : null;
      if (text && v === null) return (shake(el, prev), false);
      const list = [...(pr[s.key] ?? [])];
      while (list.length <= s.i) list.push(null);
      list[s.i] = v;
      while (list.length && list[list.length - 1] == null) list.pop();
      if (list.length) pr[s.key] = list;
      else delete pr[s.key];
    }
    if (!Object.keys(pr).length) delete r.parts[s.part.id];
    setSportResult(cls, course, assessment, st.id, r);
    el.value = shown(grades.get(st.id), s);
    return true;
  }

  function onkeydown(e: KeyboardEvent, st: Student, s: Slot, row: number) {
    const el = e.target as HTMLInputElement;
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (commit(st, s, el)) move(row + 1, colOf(s));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commit(st, s, el)) move(row - 1, colOf(s));
    } else if (e.key === 'Escape') {
      el.value = shown(grades.get(st.id), s);
      el.blur();
    } else if (s.key === 'value' && /^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      // Teilnoten: eine Ziffer genügt, weiter zum nächsten Feld der Zeile.
      e.preventDefault();
      el.value = e.key;
      if (commit(st, s, el)) move(row, colOf(s) + 1 < slots.length ? colOf(s) + 1 : colOf(s)) ;
    } else if ((e.key === 'x' || e.key === 'X') && !e.metaKey && !e.ctrlKey && !el.value) {
      e.preventDefault();
      markAbsent(st);
      move(row + 1, colOf(s));
    }
  }

  function markAbsent(st: Student) {
    const g = grades.get(st.id);
    setAssessmentGrade(cls, course, assessment, st.id, { value: null, status: makeup ? 'nachtermin' : 'nicht_gewertet', comment: g?.comment || ABSENT_COMMENT });
  }

  function toggleExempt(st: Student) {
    const g = grades.get(st.id);
    if (g?.status === 'befreit') {
      if (g.sport) setSportResult(cls, course, assessment, st.id, result(g));
      else setAssessmentGrade(cls, course, assessment, st.id, g.comment ? { value: null, status: 'gewertet', comment: g.comment } : null);
    } else {
      setAssessmentGrade(cls, course, assessment, st.id, { value: null, status: 'befreit', comment: g?.comment ?? '' });
    }
  }

  const partHead = (p: SportPart) =>
    p.kind === 'note' ? p.label : `${p.label}${p.unit !== 'n' ? ` (${unitSuffix(p.unit, p.thresholds[0])})` : ''}`;
</script>

<div class="overflow-x-auto">
  <table class="w-full text-[0.8125rem]">
    <thead class="text-left text-[0.6875rem] uppercase tracking-wider text-slate-400">
      <tr>
        <th rowspan="2" class="w-10 px-5 py-2 align-bottom font-semibold">#</th>
        <th rowspan="2" class="px-2 py-2 align-bottom font-semibold">Name</th>
        {#each spec.parts as p (p.id)}
          <th colspan={p.kind === 'note' ? 1 : p.kind === 'fortschritt' ? p.attempts * 2 + 1 : p.attempts + 1} class="border-l border-slate-100 px-2 pt-2 text-center font-semibold normal-case tracking-normal text-slate-500 dark:border-line-dark">
            {partHead(p)}
            {#if spec.parts.length > 1}<span class="font-normal text-slate-400"> · ×{String(p.weight).replace('.', ',')}</span>{/if}
          </th>
        {/each}
        <th rowspan="2" class="w-16 border-l border-slate-100 px-2 py-2 text-center align-bottom font-semibold dark:border-line-dark">Note</th>
        <th rowspan="2" class="w-24"></th>
      </tr>
      <tr>
        {#each spec.parts as p (p.id)}
          {#if p.kind === 'note'}
            <th class="border-l border-slate-100 px-2 pb-1.5 text-center text-[0.625rem] font-medium dark:border-line-dark">1–6</th>
          {:else}
            {#if p.kind === 'fortschritt'}
              {#each Array(p.attempts) as _, i (i)}<th class="px-1 pb-1.5 text-center text-[0.625rem] font-medium {i === 0 ? 'border-l border-slate-100 dark:border-line-dark' : ''}">Eingang{p.attempts > 1 ? ` ${i + 1}` : ''}</th>{/each}
            {/if}
            {#each Array(p.attempts) as _, i (i)}<th class="px-1 pb-1.5 text-center text-[0.625rem] font-medium {i === 0 && p.kind !== 'fortschritt' ? 'border-l border-slate-100 dark:border-line-dark' : ''}">{p.kind === 'fortschritt' ? 'Ausgang' : 'Versuch'}{p.attempts > 1 ? ` ${i + 1}` : ''}</th>{/each}
            <th class="px-1 pb-1.5 text-center text-[0.625rem] font-medium">{p.kind === 'fortschritt' ? '%' : 'Teil'}</th>
          {/if}
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each students as st, row (st.id)}
        {@const g = grades.get(st.id)}
        {@const out = sportOutcome(spec, g?.sport, rounding)}
        {@const off = !!g && g.status !== 'gewertet'}
        <tr class="group border-t border-slate-100 transition dark:border-line-dark {off ? 'bg-slate-50/60 dark:bg-white/[0.02]' : 'hover:bg-brand-50/40 dark:hover:bg-white/[0.02]'}">
          <td class="px-5 py-1.5 tabular-nums text-slate-400">{row + 1}</td>
          <td class="whitespace-nowrap px-2 py-1.5 font-medium">{st.lastName}, <span class="font-normal text-slate-500">{st.firstName}</span></td>
          {#each spec.parts as p, pi (p.id)}
            {@const o = out.parts[pi]}
            {#each slots.filter((x) => x.part.id === p.id) as s, si (`${s.key}${s.i}`)}
              {@const col = colOf(s)}
              <td class="px-0.5 py-1 {si === 0 ? 'border-l border-slate-100 pl-1.5 dark:border-line-dark' : ''}">
                <input
                  data-sport="{row}-{col}"
                  class="h-8 rounded-lg border-0 bg-transparent text-center text-[0.8125rem] tabular-nums outline-none ring-1 ring-inset ring-slate-200/70 transition placeholder:text-slate-300 hover:ring-slate-300 focus:bg-white focus:shadow-glow focus:ring-brand-400 disabled:opacity-40 dark:ring-line-dark dark:placeholder:text-slate-600 dark:focus:bg-white/10
                    {s.key === 'value' ? 'w-11 font-semibold' : 'w-[4.5rem]'} {isBest(g, s) ? 'font-semibold text-emerald-700 ring-emerald-300 dark:text-emerald-300' : ''}"
                  inputmode={s.key === 'value' ? 'numeric' : 'decimal'}
                  autocomplete="off"
                  placeholder={s.key === 'value' ? '·' : s.part.kind === 'note' ? '' : UNIT_PLACEHOLDER[s.part.unit]}
                  title={s.part.kind !== 'note' ? UNIT_HINT[s.part.unit] : 'Note 1–6'}
                  value={shown(g, s)}
                  disabled={off && g?.status !== 'nachtermin'}
                  onfocus={(e) => (e.target as HTMLInputElement).select()}
                  onchange={(e) => commit(st, s, e.target as HTMLInputElement)}
                  onkeydown={(e) => onkeydown(e, st, s, row)}
                  aria-label="{st.firstName} {st.lastName}: {p.label}{s.key === 'entry' ? ' Eingangstest' : s.part.kind === 'fortschritt' ? ' Ausgangstest' : ''}{s.key !== 'value' ? ` Versuch ${s.i + 1}` : ''}"
                />
              </td>
            {/each}
            {#if p.kind !== 'note'}
              <td class="px-1 py-1 text-center">
                {#if o.progress}
                  <span class="text-[0.75rem] tabular-nums {o.progress.percent >= 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}" title="Eingangstest {o.progress.entryGrade}, Ausgangstest {o.progress.exitGrade}, Verbesserungsnote {o.progress.improvementGrade ?? '–'}{o.progress.capped ? ' – begrenzt auf die bessere Testnote' : ''}">
                    {o.progress.percent >= 0 ? '+' : ''}{o.progress.percent.toFixed(1).replace('.', ',')}
                  </span>
                {:else if o.grade}
                  <GradeBadge value={o.grade} size="sm" />
                {/if}
              </td>
            {/if}
          {/each}
          <td class="border-l border-slate-100 px-2 py-1 text-center dark:border-line-dark">
            {#if g && g.status !== 'gewertet'}
              <GradeBadge value={g.value} status={g.status} title={g.comment || STATUS_LABEL[g.status]} />
            {:else if out.value}
              <span title={out.raw !== null && spec.parts.length > 1 ? `rechnerisch ${out.raw.toFixed(2).replace('.', ',')}` : ''}><GradeBadge value={out.value} pop /></span>
            {:else if g?.sport}
              <span class="text-[0.6875rem] text-amber-600" title="Es fehlen noch Angaben">offen</span>
            {/if}
          </td>
          <td class="px-2 py-1 text-right whitespace-nowrap">
            <button
              class="rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1 ring-inset transition {g?.status === 'befreit'
                ? 'bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-200'
                : 'text-slate-500 ring-slate-200 opacity-0 hover:bg-slate-50 group-hover:opacity-100 focus:opacity-100 dark:ring-line-dark dark:hover:bg-white/5'}"
              onclick={() => toggleExempt(st)}
              title="Vom Sportunterricht befreit (Attest): keine Note für diesen Nachweis"
            >befreit</button>
            <button class="btn btn-ghost h-7 w-7 px-0 opacity-0 transition group-hover:opacity-100 focus:opacity-100" title="Status, Bemerkung, Verlauf" onclick={() => onopen(st)}>
              <Icon name="edit" size={14} />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
