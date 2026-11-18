<script lang="ts">
  import type { Reveal } from '../lib/state/reveal.svelte';
  import Icon from './Icon.svelte';

  /** Restzeit und „Verbergen“ im Kopf eines eingeblendeten geschützten Fensters. */
  let { reveal }: { reveal: Reveal } = $props();
</script>

{#if reveal.open}
  <span class="flex items-center gap-1.5 text-[0.75rem] tabular-nums text-slate-500" title="Wird danach automatisch wieder verdeckt">
    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{reveal.left} s
  </span>
  <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={reveal.hide}><Icon name="eyeOff" size={14} /> Verbergen</button>
{/if}
