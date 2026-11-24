<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Reveal } from '../lib/state/reveal.svelte';
  import { collapsed } from '../lib/state/collapsed.svelte';
  import Widget from './Widget.svelte';
  import Locked from './Locked.svelte';
  import RevealTimer from './RevealTimer.svelte';

  /**
   * Fenster der Startseite mit Schülernamen: zunächst verdeckt, Inhalt erst
   * nach „Einblenden“ und nur für eine Minute. Verdeckt rendert es `children`
   * gar nicht, sodass keine Namen im Dokument stehen.
   */
  let {
    id,
    title,
    count,
    lockedTitle,
    lockedText,
    empty,
    children,
  }: {
    /** Kennung zum Speichern des Ein-/Ausklappzustands. */
    id: string;
    title: string;
    count: number;
    lockedTitle: string;
    lockedText?: string;
    empty: string;
    children: Snippet;
  } = $props();

  const reveal = new Reveal(60);
  $effect(() => reveal.attach());
  // Beim Einklappen sofort wieder verdecken.
  $effect(() => {
    if (collapsed.has(id)) reveal.hide();
  });
</script>

<Widget {id} {title} badge={count || null}>
  {#snippet actions()}<RevealTimer {reveal} />{/snippet}
  <div class="card relative overflow-hidden">
    {#if !count}
      <p class="px-4 py-5 text-[0.8125rem] text-slate-500">{empty}</p>
    {:else if !reveal.open}
      <Locked
        title={lockedTitle}
        text={lockedText ?? `Aus Datenschutzgründen verdeckt. Wird nach ${reveal.seconds} Sekunden automatisch wieder ausgeblendet.`}
        rows={[70, 58, 66, 50]}
        onshow={reveal.show}
      />
    {:else}
      <div class="animate-fade-up">{@render children()}</div>
    {/if}
  </div>
</Widget>
