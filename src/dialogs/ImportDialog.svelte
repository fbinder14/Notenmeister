<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import StudentImport, { type ImportSource } from '../ui/StudentImport.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { SchoolClass } from '../lib/domain/types';

  let { open = $bindable(false), cls }: { open?: boolean; cls: SchoolClass } = $props();

  let source = $state<ImportSource>('einfuegen');
  let count = $state(0);
  let panel = $state<ReturnType<typeof StudentImport>>();

  function imported(n: number, skipped: number, from: ImportSource) {
    toast.success(`${n} Schüler${n === 1 ? '' : 'innen und Schüler'} übernommen${skipped ? `, ${skipped} bereits vorhanden` : ''}.`);
    if (from !== 'einzeln') open = false;
  }
</script>

<Modal bind:open title="Schülerinnen und Schüler hinzufügen" subtitle="Klasse {cls.name}" width="max-w-2xl">
  <StudentImport bind:this={panel} bind:source bind:count {cls} onimported={imported} />
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>{source === 'einzeln' ? 'Fertig' : 'Abbrechen'}</button>
    {#if source !== 'einzeln'}
      <button class="btn btn-primary" disabled={!count} onclick={() => panel?.commit()}>{count} übernehmen</button>
    {/if}
  {/snippet}
</Modal>
