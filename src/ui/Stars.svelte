<script lang="ts">
  import type { Stars } from '../lib/domain/types';

  /**
   * Sternreihe 1–5. Mit `onchange` als Eingabe (Klick, Tasten 1–5, Pfeile),
   * sonst reine Anzeige; `value` darf dann auch halbe Werte haben (Durchschnitt).
   */
  let {
    value,
    size = 16,
    onchange,
  }: { value: number | null; size?: number; onchange?: (v: Stars) => void } = $props();

  let hover = $state<number | null>(null);
  const shown = $derived(hover ?? value ?? 0);
  const STAR = 'M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L12 2.8Z';
  const uid = Math.random().toString(36).slice(2);

  /** Füllgrad eines Sterns (0, 0,5 oder 1). */
  function fill(i: number): number {
    const f = shown - i;
    return f >= 0.75 ? 1 : f >= 0.25 ? 0.5 : 0;
  }

  function onkeydown(e: KeyboardEvent) {
    if (!onchange) return;
    if (/^[1-5]$/.test(e.key)) onchange(Number(e.key) as Stars);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onchange(Math.min(5, (value ?? 0) + 1) as Stars);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onchange(Math.max(1, (value ?? 2) - 1) as Stars);
    else return;
    e.preventDefault();
  }
</script>

{#snippet star(i: number)}
  {@const f = fill(i)}
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id="half-{uid}-{i}"><stop offset="50%" stop-color="currentColor" /><stop offset="50%" stop-color="transparent" /></linearGradient>
    </defs>
    <path d={STAR} class="text-slate-300 dark:text-white/20" fill="currentColor" />
    {#if f > 0}<path d={STAR} class="text-amber-400" fill={f === 1 ? 'currentColor' : `url(#half-${uid}-${i})`} />{/if}
  </svg>
{/snippet}

{#if onchange}
  <div
    class="inline-flex items-center gap-0.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    role="slider"
    tabindex="0"
    aria-label="Qualität in Sternen"
    aria-valuemin={1}
    aria-valuemax={5}
    aria-valuenow={value ?? 0}
    aria-valuetext="{value ?? 0} von 5 Sternen"
    {onkeydown}
    onmouseleave={() => (hover = null)}
  >
    {#each [0, 1, 2, 3, 4] as i (i)}
      <button type="button" tabindex="-1" class="p-0.5 transition active:scale-90" onmouseenter={() => (hover = i + 1)} onclick={() => onchange((i + 1) as Stars)} aria-label="{i + 1} {i === 0 ? 'Stern' : 'Sterne'}">
        {@render star(i)}
      </button>
    {/each}
  </div>
{:else}
  <span class="inline-flex items-center gap-px" role="img" aria-label="{String(Math.round((value ?? 0) * 10) / 10).replace('.', ',')} von 5 Sternen">
    {#each [0, 1, 2, 3, 4] as i (i)}{@render star(i)}{/each}
  </span>
{/if}
