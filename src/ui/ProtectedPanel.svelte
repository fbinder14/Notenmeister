<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Reveal } from '../lib/state/reveal.svelte';
  import Locked from './Locked.svelte';
  import RevealTimer from './RevealTimer.svelte';

  /**
   * Fenster der Startseite mit Schülernamen: zunächst verdeckt, Inhalt erst
   * nach „Einblenden“ und nur für eine Minute. Verdeckt rendert es `children`
   * gar nicht, sodass keine Namen im Dokument stehen.
   */
  let {
    title,
    count,
    lockedTitle,
    lockedText,
    empty,
    children,
  }: {
    title: string;
    count: number;
    lockedTitle: string;
    lockedText?: string;
    empty: string;
    children: Snippet;
  } = $props();

  const reveal = new Reveal(60);
  $effect(() => reveal.attach());
</script>

<div>
  <div class="mb-3 flex items-center gap-2">
    <h2 class="flex-1 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
    <RevealTimer {reveal} />
  </div>
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
</div>
