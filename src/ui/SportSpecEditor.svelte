<script lang="ts">
  import {
    disciplinesFor,
    formatMeasure,
    measurePart,
    measureRanges,
    notePart,
    parseMeasure,
    SPORT_FIELDS,
    SPORT_GROUP_LABEL,
    SPORT_TEMPLATES,
    templateSpec,
    UNIT_LABEL,
    unitSuffix,
    validThresholds,
    type SportTemplate,
  } from '../lib/domain/sport';
  import { disciplineById, hasTable, isbThresholds } from '../lib/domain/sportTables';
  import type { SportField, SportGroup, SportPartMeasure, SportSpec, SportUnit } from '../lib/domain/types';
  import Icon from './Icon.svelte';
  import { GRADE_CLASS } from './colors';

  /**
   * Bewertungsaufbau eines Sport-Nachweises: Handlungsfeld, Vorlage, Disziplin und
   * die einzelnen Teile (Teilnoten und Messwerte mit Notengrenzen).
   */
  let {
    spec = $bindable(),
    gradeLevel,
    group,
    locked = false,
    ontitle,
  }: {
    spec: SportSpec;
    gradeLevel: number;
    group: SportGroup | undefined;
    /** Es gibt schon Noten: Vorlage und Disziplin nicht mehr umstellen. */
    locked?: boolean;
    /** Vorschlag für den Titel, z. B. der Name der Disziplin. */
    ontitle?: (t: string) => void;
  } = $props();

  let template = $state<SportTemplate>(guessTemplate(spec));
  let disciplineId = $state(firstDiscipline(spec));

  function firstDiscipline(s: SportSpec): string {
    return s.parts.find((p): p is SportPartMeasure => p.kind !== 'note')?.discipline ?? '';
  }

  /** Disziplinen des Felds; mit Tabelle für Jahrgangsstufe und Wertungstabelle zuerst. */
  const disciplines = $derived(disciplinesFor(spec.field).filter((d) => d.levels[gradeLevel]));
  const usesMeasure = $derived(template !== 'note');

  function guessTemplate(s: SportSpec): SportTemplate {
    if (s.parts.some((p) => p.kind === 'fortschritt')) return 'fortschritt';
    const m = s.parts.some((p) => p.kind === 'messung');
    const n = s.parts.some((p) => p.kind === 'note');
    return m && n ? 'technik_leistung' : m ? 'leistung' : 'note';
  }

  function rebuild() {
    const d = disciplineById(disciplineId) ?? null;
    spec = templateSpec(template, spec.field, d && usesMeasure ? d : null, gradeLevel, group);
    if (d && usesMeasure) ontitle?.(d.name);
  }

  function setField(f: SportField) {
    spec.field = f;
    if (locked) return;
    const first = disciplinesFor(f).find((d) => d.levels[gradeLevel]);
    disciplineId = first?.id ?? '';
    if (f !== 'leichtathletik' && f !== 'schwimmen' && f !== 'fitness' && template !== 'note') template = 'note';
    if ((f === 'leichtathletik' || f === 'schwimmen') && template === 'note') template = 'leistung';
    rebuild();
  }

  function setTemplate(t: SportTemplate) {
    template = t;
    rebuild();
  }

  function setDiscipline(id: string) {
    disciplineId = id;
    rebuild();
  }

  function fromTable(p: SportPartMeasure) {
    if (!p.discipline || !group) return;
    const t = isbThresholds(p.discipline, gradeLevel, group);
    if (t) p.thresholds = t;
  }

  function setThreshold(p: SportPartMeasure, i: number, text: string) {
    const v = parseMeasure(text, p.unit);
    if (v === null) return;
    p.thresholds[i] = v;
  }

  function setUnit(p: SportPartMeasure, unit: SportUnit) {
    p.unit = unit;
    p.better = unit === 's' ? 'low' : 'high';
  }

  function remove(id: string) {
    spec.parts = spec.parts.filter((p) => p.id !== id);
  }

  const totalWeight = $derived(spec.parts.reduce((s, p) => s + (p.weight > 0 ? p.weight : 0), 0));
  const pct = (w: number) => (totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0);
</script>

<div class="grid gap-4">
  <div class="grid grid-cols-2 gap-3">
    <label>
      <span class="label">Handlungsfeld</span>
      <select class="field" value={spec.field} onchange={(e) => setField((e.target as HTMLSelectElement).value as SportField)}>
        {#each Object.entries(SPORT_FIELDS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
      </select>
    </label>
    {#if usesMeasure && !locked}
      <label>
        <span class="label">Disziplin</span>
        <select class="field" value={disciplineId} onchange={(e) => setDiscipline((e.target as HTMLSelectElement).value)}>
          {#each disciplines as d (d.id)}<option value={d.id}>{d.name}{hasTable(d.id, gradeLevel, group) ? '' : ' (ohne Tabelle)'}</option>{/each}
          <option value="">Eigene Messung …</option>
        </select>
      </label>
    {/if}
  </div>

  {#if !locked}
    <div>
      <span class="label">Bewertung</span>
      <div class="grid grid-cols-2 gap-1.5">
        {#each Object.entries(SPORT_TEMPLATES) as [k, t] (k)}
          <button
            type="button"
            class="rounded-xl px-3 py-2 text-left ring-1 ring-inset transition {template === k
              ? 'bg-brand-50 ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-500/40'
              : 'ring-slate-200 hover:bg-slate-50 dark:ring-line-dark dark:hover:bg-white/5'}"
            onclick={() => setTemplate(k as SportTemplate)}
          >
            <div class="text-[0.8125rem] font-semibold">{t.name}</div>
            <div class="text-[0.6875rem] text-slate-500">{t.hint}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if usesMeasure && !group}
    <p class="rounded-lg bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
      Für dieses Fach ist keine Wertungstabelle (Jungen/Mädchen) gewählt. Trage die Notengrenzen selbst ein oder wähle die Tabelle unter „Unterricht bearbeiten“.
    </p>
  {/if}

  <div class="grid gap-2.5">
    {#each spec.parts as p (p.id)}
      <div class="rounded-xl border border-slate-200 p-3 dark:border-line-dark">
        <div class="flex items-end gap-2">
          <label class="flex-1">
            <span class="label">{p.kind === 'note' ? 'Teilnote' : p.kind === 'fortschritt' ? 'Leistungsfortschritt' : 'Messwert'}</span>
            <input class="field" bind:value={p.label} />
          </label>
          <label class="w-24">
            <span class="label">Gewicht</span>
            <input class="field" type="number" min="0" step="0.5" bind:value={p.weight} />
          </label>
          <span class="w-12 pb-2 text-right text-[0.75rem] tabular-nums text-slate-500">{pct(p.weight)} %</span>
          {#if spec.parts.length > 1}
            <button type="button" class="btn btn-ghost mb-0.5 h-8 w-8 px-0 text-slate-400 hover:text-rose-600" onclick={() => remove(p.id)} aria-label="Teil entfernen"><Icon name="trash" size={14} /></button>
          {/if}
        </div>

        {#if p.kind !== 'note'}
          {@const ok = validThresholds(p.thresholds, p.better)}
          <div class="mt-3 grid grid-cols-3 gap-2">
            <label>
              <span class="label">Einheit</span>
              <select class="field" value={p.unit} onchange={(e) => setUnit(p, (e.target as HTMLSelectElement).value as SportUnit)} disabled={!!p.discipline}>
                {#each Object.entries(UNIT_LABEL) as [k, v] (k)}<option value={k}>{v}</option>{/each}
              </select>
            </label>
            <label>
              <span class="label">Besser ist</span>
              <select class="field" bind:value={p.better} disabled={!!p.discipline}>
                <option value="low">weniger</option>
                <option value="high">mehr</option>
              </select>
            </label>
            <label>
              <span class="label">Versuche</span>
              <input class="field" type="number" min="1" max="6" bind:value={p.attempts} />
            </label>
          </div>
          <div class="mt-3">
            <div class="mb-1 flex items-center justify-between">
              <span class="label mb-0">Notengrenzen{p.unit !== 'n' ? ` (${unitSuffix(p.unit, p.thresholds[0])})` : ''}</span>
              {#if p.discipline && group && hasTable(p.discipline, gradeLevel, group)}
                <button type="button" class="text-[0.6875rem] font-medium text-brand-600 hover:underline" onclick={() => fromTable(p)}>
                  ISB-Tabelle Jgst. {gradeLevel}, {SPORT_GROUP_LABEL[group]} übernehmen
                </button>
              {/if}
            </div>
            <div class="grid grid-cols-6 gap-1.5">
              {#each measureRanges(p) as r, i (r.grade)}
                <div class="rounded-xl px-1.5 py-1.5 text-center ring-1 ring-inset {GRADE_CLASS[r.grade]}">
                  <div class="text-[0.8125rem] font-semibold">{r.grade}</div>
                  {#if i < 5}
                    <input
                      class="mt-0.5 h-6 w-full rounded-md border-0 bg-white/70 text-center text-[0.71875rem] tabular-nums outline-none ring-1 ring-inset ring-black/5 focus:ring-brand-400 dark:bg-black/20"
                      value={formatMeasure(p.thresholds[i], p.unit)}
                      onchange={(e) => setThreshold(p, i, (e.target as HTMLInputElement).value)}
                      aria-label="Grenze für Note {r.grade}"
                    />
                    <div class="mt-0.5 text-[0.59375rem] opacity-70">{p.better === 'low' ? 'bis' : 'ab'}</div>
                  {:else}
                    <div class="mt-1 text-[0.6875rem] opacity-80">{r.text}</div>
                  {/if}
                </div>
              {/each}
            </div>
            {#if !ok}
              <p class="mt-1.5 text-[0.75rem] text-rose-600">Die Grenzen müssen von Note 1 bis 5 {p.better === 'low' ? 'ansteigen' : 'abnehmen'}.</p>
            {:else if p.kind === 'fortschritt'}
              <p class="mt-1.5 text-[0.75rem] text-slate-500">
                Eingangs- und Ausgangstest werden mit diesen Grenzen benotet. Gesamtnote nach ISB: (Eingangstest + Ausgangstest + 3 × Verbesserungsnote) / 5;
                Verbesserung ab 5 % → 1, 4 % → 2, 3 % → 3, 2 % → 4, 1 % → 5. Nie schlechter als die bessere Testnote.
              </p>
            {:else if p.discipline}
              <p class="mt-1.5 text-[0.75rem] text-slate-500">Vorschlag aus den ISB-Orientierungstabellen 2023 (unverbindlich, frei anpassbar).</p>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex gap-2">
    <button type="button" class="btn btn-soft h-8 text-[0.75rem]" onclick={() => (spec.parts = [...spec.parts, notePart('Kriterium')])}><Icon name="plus" size={13} /> Teilnote</button>
    <button type="button" class="btn btn-soft h-8 text-[0.75rem]" onclick={() => (spec.parts = [...spec.parts, measurePart(null, gradeLevel, group)])}><Icon name="plus" size={13} /> Messwert</button>
  </div>
</div>
