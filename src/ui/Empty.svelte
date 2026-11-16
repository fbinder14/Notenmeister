<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';
  let { icon, title, text = '', children }: { icon: IconName; title: string; text?: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300/80 px-6 py-14 text-center dark:border-line-dark">
  <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 text-brand-500 ring-1 ring-brand-100 dark:from-brand-500/10 dark:to-violet-500/10 dark:ring-brand-500/20">
    <Icon name={icon} size={22} />
  </div>
  <h3 class="text-[0.9375rem] font-semibold text-slate-900 dark:text-white">{title}</h3>
  {#if text}<p class="mt-1 max-w-sm text-[0.8125rem] leading-relaxed text-slate-500">{text}</p>{/if}
  {#if children}<div class="mt-5 flex gap-2">{@render children()}</div>{/if}
</div>
