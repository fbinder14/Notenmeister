<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    title,
    eyebrow = '',
    back = '',
    actions,
    children,
  }: { title: string; eyebrow?: string; back?: string; actions?: Snippet; children?: Snippet } = $props();
</script>

<header class="glass no-print sticky top-0 z-20 border-b px-8 py-4">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex min-w-0 items-center gap-3">
      {#if back}
        <a href={back} class="btn btn-ghost h-8 w-8 px-0" aria-label="Zurück"><Icon name="back" size={16} /></a>
      {/if}
      <div class="min-w-0">
        {#if eyebrow}<div class="truncate text-[0.75rem] font-medium text-slate-500">{eyebrow}</div>{/if}
        <h1 class="truncate text-[1.25rem] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      </div>
    </div>
    {#if actions}<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
  </div>
  {#if children}<div class="mt-3">{@render children()}</div>{/if}
</header>
