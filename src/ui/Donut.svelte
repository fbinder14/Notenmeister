<script lang="ts">
  /**
   * Ringdiagramm aus SVG-Kreisen. Farben kommen als Tailwind-Klassen
   * (`stroke-…`), damit Hell- und Dunkelmodus greifen.
   */
  let {
    segments,
    label,
    size = 112,
    thickness = 14,
    children,
  }: {
    segments: Array<{ value: number; class: string }>;
    label: string;
    size?: number;
    thickness?: number;
    children?: import('svelte').Snippet;
  } = $props();

  const r = $derived((size - thickness) / 2);
  const c = $derived(2 * Math.PI * r);
  const total = $derived(segments.reduce((s, x) => s + x.value, 0));
  /** Kleiner Abstand zwischen den Segmenten, nur wenn mehr als eines sichtbar ist. */
  const gap = $derived(segments.filter((s) => s.value > 0).length > 1 ? 2 : 0);

  const arcs = $derived.by(() => {
    let offset = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const len = (s.value / total) * c;
        const arc = { len: Math.max(len - gap, 0.5), offset, cls: s.class };
        offset += len;
        return arc;
      });
  });
</script>

<div class="relative shrink-0" style="width: {size}px; height: {size}px" role="img" aria-label={label}>
  <svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90">
    <circle cx={size / 2} cy={size / 2} {r} fill="none" stroke-width={thickness} class="stroke-slate-100 dark:stroke-white/10" />
    {#each arcs as a, i (i)}
      <circle
        cx={size / 2}
        cy={size / 2}
        {r}
        fill="none"
        stroke-width={thickness}
        stroke-dasharray="{a.len} {c - a.len}"
        stroke-dashoffset={-a.offset}
        class="{a.cls} transition-all duration-500"
      />
    {/each}
  </svg>
  {#if children}
    <div class="absolute inset-0 grid place-items-center text-center">{@render children()}</div>
  {/if}
</div>
