<script lang="ts">
  import Icon from './Icon.svelte';
  import { addDays, bavarianYear, reportDay } from '../lib/domain/calendar';
  import type { Holiday, SchoolYear } from '../lib/domain/types';

  /**
   * Termine eines Schuljahres: Beginn, Zeugnisse mit Notenschluss, Ferien und
   * Abschlussprüfung. Bearbeitet das übergebene (reaktive) Schuljahr direkt.
   */
  let { year, onchange, showName = true }: { year: SchoolYear; onchange: () => void; showName?: boolean } = $props();

  const table = $derived(bavarianYear(Number(year.start.slice(0, 4))));
  const changed = () => onchange();

  // ---- Zwischenzeugnis: Ausgabetag; das 2. Halbjahr beginnt am Tag danach ----
  const getInterim = () => reportDay(year, 'zwischen');
  function setInterim(v: string) {
    if (!v) return;
    year.reportDays = { ...year.reportDays, zwischen: v };
    year.halfSwitch = addDays(v, 1);
    changed();
  }

  // ---- Notenschluss (optional) ----
  const getDeadline = (term: 'zwischen' | 'jahr') => () => year.reportDeadlines?.[term] ?? '';
  const setDeadline = (term: 'zwischen' | 'jahr') => (v: string) => {
    const next = { ...year.reportDeadlines };
    if (v) next[term] = v;
    else delete next[term];
    if (Object.keys(next).length) year.reportDeadlines = next;
    else delete year.reportDeadlines;
    changed();
  };

  // ---- Abschlussprüfung (optional) ----
  const getExam = (k: 'start' | 'end' | 'deadline') => () => year.finalExam?.[k] ?? '';
  const setExam = (k: 'start' | 'end' | 'deadline') => (v: string) => {
    const next = { start: '', end: '', ...year.finalExam };
    if (v) next[k] = v;
    else delete (next as Partial<typeof next>)[k];
    if (next.start && next.end) year.finalExam = next;
    else if (!next.start && !next.end && !next.deadline) delete year.finalExam;
    else year.finalExam = next; // halb ausgefüllt: speichern, damit nichts verloren geht
    changed();
  };

  // ---- Ferien ----
  function addHoliday() {
    year.holidays ??= [];
    const d = year.start;
    year.holidays.push({ name: 'Ferien', start: d, end: d });
    changed();
  }
  function removeHoliday(h: Holiday) {
    year.holidays = (year.holidays ?? []).filter((x) => x !== h);
    changed();
  }
  function takeTable() {
    if (!table) return;
    const t = $state.snapshot(table);
    Object.assign(year, { start: t.start, halfSwitch: t.halfSwitch, end: t.end, reportDays: t.reportDays, holidays: t.holidays });
    if (!year.reportDeadlines) year.reportDeadlines = t.reportDeadlines;
    if (t.finalExam && !year.finalExam) year.finalExam = t.finalExam;
    changed();
  }
  const differsFromTable = $derived(
    !!table && (year.start !== table.start || year.end !== table.end || getInterim() !== table.reportDays?.zwischen || (year.holidays?.length ?? 0) !== table.holidays?.length),
  );

  const order = $derived(year.start < getInterim() && getInterim() < year.end);
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
</script>

<div class="grid gap-3">
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#if showName}
      <label><span class="label">Bezeichnung</span><input class="field" bind:value={year.name} onchange={changed} /></label>
    {/if}
    <label><span class="label">Erster Schultag</span><input class="field" type="date" bind:value={year.start} onchange={changed} /></label>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="rounded-xl border border-slate-200 p-3 dark:border-line-dark">
      <div class="mb-2 flex items-center gap-2 text-[0.8125rem] font-semibold"><Icon name="award" size={15} class="text-brand-500" /> Zwischenzeugnis</div>
      <div class="grid grid-cols-2 gap-2">
        <label><span class="label">Ausgabe</span><input class="field" type="date" bind:value={getInterim, setInterim} /></label>
        <label><span class="label">Notenschluss</span><input class="field" type="date" bind:value={getDeadline('zwischen'), setDeadline('zwischen')} /></label>
      </div>
    </div>
    <div class="rounded-xl border border-slate-200 p-3 dark:border-line-dark">
      <div class="mb-2 flex items-center gap-2 text-[0.8125rem] font-semibold"><Icon name="award" size={15} class="text-violet-500" /> Jahreszeugnis</div>
      <div class="grid grid-cols-2 gap-2">
        <label><span class="label">Ausgabe (letzter Schultag)</span><input class="field" type="date" bind:value={year.end} onchange={changed} /></label>
        <label><span class="label">Notenschluss</span><input class="field" type="date" bind:value={getDeadline('jahr'), setDeadline('jahr')} /></label>
      </div>
    </div>
  </div>
  {#if !order}
    <p class="text-[0.75rem] text-rose-600">Bitte prüfen: Schulbeginn, Zwischenzeugnis und Jahreszeugnis müssen in dieser Reihenfolge liegen.</p>
  {/if}

  <details class="group/h rounded-xl border border-slate-200 dark:border-line-dark">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[0.8125rem] font-medium">
      <span class="flex items-center gap-2">
        <Icon name="sun" size={15} class="text-amber-500" /> Ferien
        <span class="text-[0.75rem] font-normal text-slate-500">· {year.holidays?.length ? `${year.holidays.length} Zeiträume` : 'keine eingetragen'}</span>
      </span>
      <Icon name="chevron" size={15} class="text-slate-400 transition group-open/h:rotate-90" />
    </summary>
    <div class="grid gap-2 border-t border-slate-100 px-3 py-3 dark:border-line-dark">
      {#each year.holidays ?? [] as h, i (i)}
        <div class="grid grid-cols-[1fr_9rem_9rem_auto] items-center gap-2">
          <input class="field h-8" bind:value={h.name} onchange={changed} aria-label="Bezeichnung" />
          <input class="field h-8" type="date" bind:value={h.start} onchange={changed} aria-label="Erster Ferientag" />
          <input class="field h-8" type="date" bind:value={h.end} onchange={changed} aria-label="Letzter Ferientag" />
          <button type="button" class="btn btn-ghost h-8 px-2 text-slate-400 hover:text-rose-600" onclick={() => removeHoliday(h)} aria-label="Entfernen"><Icon name="x" size={14} /></button>
        </div>
      {/each}
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-soft h-8" onclick={addHoliday}><Icon name="plus" size={14} /> Zeitraum</button>
        {#if table && differsFromTable}
          <button type="button" class="btn btn-ghost h-8" onclick={takeTable}><Icon name="sparkles" size={14} /> Termine laut Ferienordnung übernehmen</button>
        {/if}
      </div>
    </div>
  </details>

  <details class="group/e rounded-xl border border-slate-200 dark:border-line-dark" open={!!year.finalExam}>
    <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[0.8125rem] font-medium">
      <span class="flex items-center gap-2">
        <Icon name="book" size={15} class="text-rose-500" /> Abschlussprüfung 10. Klasse
        <span class="text-[0.75rem] font-normal text-slate-500">· {year.finalExam?.start && year.finalExam?.end ? `${fmt(year.finalExam.start)}–${fmt(year.finalExam.end)}` : 'nicht eingetragen'}</span>
      </span>
      <Icon name="chevron" size={15} class="text-slate-400 transition group-open/e:rotate-90" />
    </summary>
    <div class="grid gap-2 border-t border-slate-100 px-3 py-3 dark:border-line-dark">
      <div class="grid grid-cols-3 gap-2">
        <label><span class="label">Schriftlich ab</span><input class="field" type="date" bind:value={getExam('start'), setExam('start')} /></label>
        <label><span class="label">bis</span><input class="field" type="date" bind:value={getExam('end'), setExam('end')} /></label>
        <label><span class="label">Notenschluss 10. Klassen</span><input class="field" type="date" bind:value={getExam('deadline'), setExam('deadline')} /></label>
      </div>
      <p class="text-[0.6875rem] text-slate-500">Für 10. Klassen zählt beim Jahreszeugnis dieser vorgezogene Notenschluss.</p>
    </div>
  </details>
</div>
