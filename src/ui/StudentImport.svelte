<script lang="ts" module>
  export type ImportSource = 'einfuegen' | 'datei' | 'einzeln';
</script>

<script lang="ts">
  import Icon from './Icon.svelte';
  import Segmented from './Segmented.svelte';
  import { addStudents } from '../lib/state/actions';
  import { applyMapping, decodeText, guessMapping, parseCsv, type Mapping, type Rows } from '../lib/import/table';
  import type { SchoolClass } from '../lib/domain/types';

  /**
   * Schülerinnen und Schüler übernehmen: Liste einfügen, CSV/Excel-Datei oder einzeln.
   * Wird im Dialog „Schüler hinzufügen“ und im Einrichtungsassistenten verwendet.
   */
  let {
    cls,
    source = $bindable<ImportSource>('einfuegen'),
    count = $bindable(0),
    inlineCommit = false,
    compact = false,
    onimported,
  }: {
    cls: SchoolClass;
    source?: ImportSource;
    /** Anzahl der Zeilen in der Vorschau (für den Übernehmen-Knopf außerhalb). */
    count?: number;
    /** Übernehmen-Knopf direkt unter der Vorschau anzeigen. */
    inlineCommit?: boolean;
    /** Kleinere Höhen für eingebettete Verwendung. */
    compact?: boolean;
    onimported?: (added: number, skipped: number, source: ImportSource) => void;
  } = $props();

  let pasted = $state('');
  let rows = $state<Rows>([]);
  let fileName = $state('');
  let mapping = $state<Mapping>({ hasHeader: false, last: 0, first: -1, split: 'vorname-zuerst' });
  let single = $state({ lastName: '', firstName: '' });
  let error = $state('');
  let dragging = $state(false);
  let lastInput = $state<HTMLInputElement>();

  function fromPaste() {
    rows = parseCsv(pasted);
    mapping = guessMapping(rows);
  }

  async function readFile(f: File) {
    error = '';
    fileName = f.name;
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (/\.xlsx$/i.test(f.name)) {
        const { readXlsx } = await import('../lib/import/xlsx');
        rows = await readXlsx(bytes);
      } else if (/\.xls$/i.test(f.name)) {
        throw new Error('Das alte Excel-Format (.xls) wird nicht unterstützt. Bitte als .xlsx oder CSV speichern.');
      } else {
        rows = parseCsv(decodeText(bytes));
      }
      mapping = guessMapping(rows);
    } catch (err) {
      rows = [];
      error = (err as Error).message;
    }
  }

  function pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void readFile(f);
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) void readFile(f);
  }

  const cols = $derived(Math.max(0, ...rows.map((r) => r.length)));
  const preview = $derived(rows.length ? applyMapping(rows, mapping) : []);
  const existing = $derived(new Set(cls.students.map((s) => `${s.lastName}|${s.firstName}`.toLowerCase())));
  const header = $derived(rows[0] ?? []);
  const colLabel = (i: number) => (mapping.hasHeader && header[i] ? header[i] : `Spalte ${String.fromCharCode(65 + i)}`);

  $effect(() => {
    count = source === 'einzeln' ? 0 : preview.length;
  });

  function swap() {
    if (mapping.first >= 0) mapping = { ...mapping, last: mapping.first, first: mapping.last };
    else mapping = { ...mapping, split: mapping.split === 'vorname-zuerst' ? 'nachname-zuerst' : 'vorname-zuerst' };
  }

  /** Übernimmt die Vorschau bzw. die Einzeleingabe; liefert die Zahl der neu Angelegten. */
  export function commit(): number {
    const list = source === 'einzeln' ? [single] : preview;
    if (!list.length) return 0;
    const n = addStudents(cls, list);
    const skipped = list.length - n;
    const from = source;
    if (source === 'einzeln') {
      single = { lastName: '', firstName: '' };
      lastInput?.focus();
    } else {
      pasted = '';
      rows = [];
      fileName = '';
    }
    onimported?.(n, skipped, from);
    return n;
  }
</script>

<div class="grid gap-4">
  <Segmented
    bind:value={source}
    options={[
      { value: 'einfuegen', label: 'Einfügen' },
      { value: 'datei', label: 'CSV / Excel' },
      { value: 'einzeln', label: 'Einzeln' },
    ]}
  />

  {#if source === 'einfuegen'}
    <label>
      <span class="label">Namensliste einfügen – eine Zeile pro Person, z. B. „Huber, Lena“ oder „Lena Huber“ oder zwei Spalten aus Excel</span>
      <textarea class="field {compact ? 'h-28' : 'h-36'} resize-y py-2 font-mono text-[0.78125rem]" bind:value={pasted} oninput={fromPaste} placeholder={'Huber, Lena\nÖztürk, Can\n…'}></textarea>
    </label>
  {:else if source === 'datei'}
    <label
      class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-[0.8125rem] text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-white/5 {dragging
        ? 'border-brand-400 bg-brand-50/60 dark:bg-white/5'
        : 'border-slate-200 dark:border-line-dark'}"
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={drop}
    >
      <Icon name="upload" size={22} class="text-brand-500" />
      {fileName || 'CSV- oder Excel-Datei (.xlsx) auswählen oder hierher ziehen'}
      <span class="text-[0.6875rem] text-slate-400">Die Datei wird nur in diesem Browser gelesen.</span>
      <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv" class="hidden" onchange={pick} />
    </label>
  {:else}
    <form
      class="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        if (single.lastName.trim() || single.firstName.trim()) commit();
      }}
    >
      <!-- svelte-ignore a11y_autofocus -->
      <label><span class="label">Nachname</span><input class="field" bind:value={single.lastName} bind:this={lastInput} autofocus /></label>
      <label><span class="label">Vorname</span><input class="field" bind:value={single.firstName} /></label>
      <button class="btn btn-primary" disabled={!single.lastName.trim() && !single.firstName.trim()}><Icon name="plus" size={15} /> Hinzufügen</button>
    </form>
    <p class="text-[0.75rem] text-slate-500">Mit <span class="kbd">↵</span> hinzufügen; das Formular bleibt für die nächste Person offen.</p>
  {/if}

  {#if error}<p class="text-[0.8125rem] text-rose-600">{error}</p>{/if}

  {#if source !== 'einzeln' && rows.length}
    <div class="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
      <label class="flex items-center gap-2 text-[0.78125rem]"><input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={mapping.hasHeader} /> Erste Zeile ist Überschrift</label>
      {#if cols > 1}
        <label class="text-[0.75rem]">
          <span class="label mb-1">Nachname</span>
          <select class="field h-8 w-40" bind:value={mapping.last}>
            {#each Array.from({ length: cols }, (_, i) => i) as i (i)}<option value={i}>{colLabel(i)}</option>{/each}
          </select>
        </label>
        <label class="text-[0.75rem]">
          <span class="label mb-1">Vorname</span>
          <select class="field h-8 w-40" bind:value={mapping.first}>
            <option value={-1}>– im Namen enthalten –</option>
            {#each Array.from({ length: cols }, (_, i) => i) as i (i)}<option value={i}>{colLabel(i)}</option>{/each}
          </select>
        </label>
      {/if}
      <button type="button" class="btn btn-soft h-8" onclick={swap}>Vor- und Nachname tauschen</button>
    </div>

    <div class="{compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto rounded-xl border border-slate-200 dark:border-line-dark">
      <table class="w-full text-[0.8125rem]">
        <thead class="sticky top-0 bg-white/90 text-left text-[0.6875rem] uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-panel-dark/90">
          <tr><th class="px-4 py-2 font-semibold">Nachname</th><th class="px-4 py-2 font-semibold">Vorname</th><th></th></tr>
        </thead>
        <tbody>
          {#each preview as p, i (i)}
            {@const dup = existing.has(`${p.lastName}|${p.firstName}`.toLowerCase())}
            <tr class="border-t border-slate-100 dark:border-line-dark {dup ? 'text-slate-400' : ''}">
              <td class="px-4 py-1.5 font-medium">{p.lastName}</td>
              <td class="px-4 py-1.5">{p.firstName}</td>
              <td class="px-4 py-1.5 text-right text-[0.6875rem]">{dup ? 'schon vorhanden' : ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if inlineCommit}
      <div class="flex justify-end">
        <button type="button" class="btn btn-primary" disabled={!preview.length} onclick={() => commit()}>
          <Icon name="check" size={15} />
          {preview.length} übernehmen
        </button>
      </div>
    {/if}
  {/if}
</div>
