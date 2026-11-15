<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { addClass, updateClass } from '../lib/state/actions';
  import { go, href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { SchoolClass, WpfGroup } from '../lib/domain/types';

  let { open = $bindable(false), cls = null }: { open?: boolean; cls?: SchoolClass | null } = $props();

  let name = $state('');
  let level = $state(7);
  let wpf = $state<WpfGroup>('');

  $effect(() => {
    if (open) {
      name = cls?.name ?? '';
      level = cls?.gradeLevel ?? 7;
      wpf = cls?.wpf ?? '';
    }
  });

  function save(e: Event) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (cls) {
        updateClass(cls, { name: name.trim(), gradeLevel: level, wpf });
      } else {
        const c = addClass(name, level, wpf);
        toast.success(`Klasse ${c.name} angelegt.`);
        go(href.cls(c.id));
      }
      open = false;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
</script>

<Modal bind:open title={cls ? 'Klasse bearbeiten' : 'Neue Klasse'} width="max-w-md">
  <form id="class-form" onsubmit={save} class="grid gap-4">
    <!-- svelte-ignore a11y_autofocus -->
    <label><span class="label">Bezeichnung</span><input class="field" bind:value={name} placeholder="z. B. 8b" autofocus /></label>
    <div class="grid grid-cols-2 gap-3">
      <label>
        <span class="label">Jahrgangsstufe</span>
        <select class="field" bind:value={level}>
          {#each [5, 6, 7, 8, 9, 10] as l (l)}<option value={l}>{l}</option>{/each}
        </select>
      </label>
      <label>
        <span class="label">Wahlpflichtfächergruppe</span>
        <select class="field" bind:value={wpf}>
          <option value="">gemischt / keine</option>
          <option value="I">I</option>
          <option value="II">II</option>
          <option value="IIIa">IIIa</option>
          <option value="IIIb">IIIb</option>
        </select>
      </label>
    </div>
    <p class="text-[12px] leading-relaxed text-slate-500">Jahrgangsstufe und Gruppe dienen als Vorschlag für die Anzahl der Schulaufgaben (RSO § 18 Abs. 1).</p>
  </form>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Abbrechen</button>
    <button form="class-form" class="btn btn-primary" disabled={!name.trim()}>{cls ? 'Speichern' : 'Anlegen'}</button>
  {/snippet}
</Modal>
