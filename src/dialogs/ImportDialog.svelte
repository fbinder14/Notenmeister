<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import Icon from '../ui/Icon.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { addStudents } from '../lib/state/actions';
  import { toast } from '../lib/state/toast.svelte';
  import { applyMapping, decodeText, guessMapping, parseCsv, type Mapping, type Rows } from '../lib/import/table';
  import type { SchoolClass } from '../lib/domain/types';

  let { open = $bindable(false), cls }: { open?: boolean; cls: SchoolClass } = $props();

  let source = $state<'einfuegen' | 'datei' | 'einzeln'>('einfuegen');
  let pasted = $state('');
  let rows = $state<Rows>([]);
  let fileName = $state('');
  let mapping = $state<Mapping>({ hasHeader: false, last: 0, first: -1, split: 'vorname-zuerst' });
  let single = $state({ lastName: '', firstName: '' });
  let error = $state('');

  $effect(() => {
    if (open) {
      pasted = '';
      rows = [];
      fileName = '';
      error = '';
      single = { lastName: '', firstName: '' };
    }
  });

  function fromPaste() {
    rows = parseCsv(pasted);
    mapping = guessMapping(rows);
  }

  async function pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
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

  const cols = $derived(Math.max(0, ...rows.map((r) => r.length)));
  const preview = $derived(rows.length ? applyMapping(rows, mapping) : []);
  const existing = $derived(new Set(cls.students.map((s) => `${s.lastName}|${s.firstName}`.toLowerCase())));
  const header = $derived(rows[0] ?? []);
  const colLabel = (i: number) => (mapping.hasHeader && header[i] ? header[i] : `Spalte ${String.fromCharCode(65 + i)}`);

  function swap() {
    if (mapping.first >= 0) mapping = { ...mapping, last: mapping.first, first: mapping.last };
    else mapping = { ...mapping, split: mapping.split === 'vorname-zuerst' ? 'nachname-zuerst' : 'vorname-zuerst' };
  }

  function importAll() {
    const n = addStudents(cls, source === 'einzeln' ? [single] : preview);
    const skipped = (source === 'einzeln' ? 1 : preview.length) - n;
    toast.success(`${n} Schüler${n === 1 ? '' : 'innen und Schüler'} übernommen${skipped ? `, ${skipped} bereits vorhanden` : ''}.`);
    if (source === 'einzeln') {
      single = { lastName: '', firstName: '' };
      return;
    }
    open = false;
  }
</script>

<Modal bind:open title="Schülerinnen und Schüler hinzufügen" subtitle="Klasse {cls.name}" width="max-w-2xl">
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
        <textarea class="field h-36 resize-y py-2 font-mono text-[12.5px]" bind:value={pasted} oninput={fromPaste} placeholder={'Huber, Lena\nÖztürk, Can\n…'}></textarea>
      </label>
    {:else if source === 'datei'}
      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-[13px] text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-line-dark dark:hover:bg-white/5">
        <Icon name="upload" size={22} class="text-brand-500" />
        {fileName || 'CSV- oder Excel-Datei (.xlsx) auswählen'}
        <span class="text-[11px] text-slate-400">Die Datei wird nur in diesem Browser gelesen.</span>
        <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv" class="hidden" onchange={pick} />
      </label>
    {:else}
      <form
        class="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
        onsubmit={(e) => {
          e.preventDefault();
          if (single.lastName.trim() || single.firstName.trim()) importAll();
        }}
      >
        <!-- svelte-ignore a11y_autofocus -->
        <label><span class="label">Nachname</span><input class="field" bind:value={single.lastName} autofocus /></label>
        <label><span class="label">Vorname</span><input class="field" bind:value={single.firstName} /></label>
        <button class="btn btn-primary" disabled={!single.lastName.trim() && !single.firstName.trim()}><Icon name="plus" size={15} /> Hinzufügen</button>
      </form>
      <p class="text-[12px] text-slate-500">Mit <span class="kbd">↵</span> hinzufügen; das Formular bleibt für die nächste Person offen.</p>
    {/if}

    {#if error}<p class="text-[13px] text-rose-600">{error}</p>{/if}

    {#if source !== 'einzeln' && rows.length}
      <div class="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
        <label class="flex items-center gap-2 text-[12.5px]"><input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={mapping.hasHeader} /> Erste Zeile ist Überschrift</label>
        {#if cols > 1}
          <label class="text-[12px]">
            <span class="label mb-1">Nachname</span>
            <select class="field h-8 w-40" bind:value={mapping.last}>
              {#each Array.from({ length: cols }, (_, i) => i) as i (i)}<option value={i}>{colLabel(i)}</option>{/each}
            </select>
          </label>
          <label class="text-[12px]">
            <span class="label mb-1">Vorname</span>
            <select class="field h-8 w-40" bind:value={mapping.first}>
              <option value={-1}>– im Namen enthalten –</option>
              {#each Array.from({ length: cols }, (_, i) => i) as i (i)}<option value={i}>{colLabel(i)}</option>{/each}
            </select>
          </label>
        {/if}
        <button type="button" class="btn btn-soft h-8" onclick={swap}>Vor- und Nachname tauschen</button>
      </div>

      <div class="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-line-dark">
        <table class="w-full text-[13px]">
          <thead class="sticky top-0 bg-white/90 text-left text-[11px] uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-panel-dark/90">
            <tr><th class="px-4 py-2 font-semibold">Nachname</th><th class="px-4 py-2 font-semibold">Vorname</th><th></th></tr>
          </thead>
          <tbody>
            {#each preview as p, i (i)}
              {@const dup = existing.has(`${p.lastName}|${p.firstName}`.toLowerCase())}
              <tr class="border-t border-slate-100 dark:border-line-dark {dup ? 'text-slate-400' : ''}">
                <td class="px-4 py-1.5 font-medium">{p.lastName}</td>
                <td class="px-4 py-1.5">{p.firstName}</td>
                <td class="px-4 py-1.5 text-right text-[11px]">{dup ? 'schon vorhanden' : ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>{source === 'einzeln' ? 'Fertig' : 'Abbrechen'}</button>
    {#if source !== 'einzeln'}
      <button class="btn btn-primary" disabled={!preview.length} onclick={importAll}>{preview.length} übernehmen</button>
    {/if}
  {/snippet}
</Modal>
