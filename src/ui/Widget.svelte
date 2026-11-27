<script lang="ts">
  import type { Snippet } from 'svelte';
  import { collapsed } from '../lib/state/collapsed.svelte';
  import Icon from './Icon.svelte';

  /**
   * Fenster der Startseite mit Überschrift zum Ein- und Ausklappen. Der Zustand
   * wird je `id` gespeichert. Eingeklappt wird der Inhalt gar nicht gerendert.
   */
  let {
    id,
    title,
    badge,
    actions,
    children,
  }: {
    id: string;
    title: string;
    /** Kurze Angabe, die nur im eingeklappten Zustand neben der Überschrift steht. */
    badge?: string | number | null;
    actions?: Snippet;
    children: Snippet;
  } = $props();

  const open = $derived(!collapsed.has(id));
</script>

<section>
  <!-- flex-wrap: In schmalen Spalten rutschen die Aktionen (z. B. „Verbergen") unter die Überschrift. -->
  <div class="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 {open ? 'mb-3' : ''}">
    <h2 class="flex-1 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">
      <button
        type="button"
        class="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-left uppercase tracking-wider transition hover:text-slate-600 dark:hover:text-slate-200"
        aria-expanded={open}
        title={open ? 'Einklappen' : 'Ausklappen'}
        onclick={() => collapsed.toggle(id)}
      >
        <Icon name="chevron" size={14} stroke={2.25} class="transition-transform duration-200 {open ? 'rotate-90' : ''}" />
        {title}
        {#if !open && badge !== undefined && badge !== null && badge !== ''}
          <span class="rounded-full bg-slate-100 px-1.5 py-px text-[0.6875rem] font-semibold normal-case tracking-normal tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">{badge}</span>
        {/if}
      </button>
    </h2>
    {#if open && actions}<div class="ml-auto flex items-center gap-2">{@render actions()}</div>{/if}
  </div>
  {#if open}{@render children()}{/if}
</section>
