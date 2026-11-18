<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from './Icon.svelte';

  let {
    open = $bindable(false),
    title,
    subtitle = '',
    width = 'max-w-lg',
    children,
    footer,
    onclose,
    bare = false,
  }: {
    open?: boolean;
    title: string;
    subtitle?: string;
    width?: string;
    children: Snippet;
    footer?: Snippet;
    onclose?: () => void;
    /** Ohne Kopfzeile und Innenabstand: Der Inhalt gestaltet beides selbst. */
    bare?: boolean;
  } = $props();

  function close() {
    open = false;
    onclose?.();
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close();
    }
  }

  function focusFirst(node: HTMLElement) {
    queueMicrotask(() => {
      const el = node.querySelector<HTMLElement>('[autofocus], input:not([type=hidden]), select, textarea, button.btn-primary');
      el?.focus();
    });
  }
</script>

<svelte:window onkeydown={onkey} />

{#if open}
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] no-print">
    <button
      type="button"
      aria-label="Schließen"
      class="fixed inset-0 cursor-default bg-slate-900/30 backdrop-blur-sm dark:bg-black/50"
      transition:fade={{ duration: 160 }}
      onclick={close}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      class="card relative w-full {width} shadow-lift"
      transition:scale={{ duration: 200, start: 0.96, easing: cubicOut }}
      use:focusFirst
    >
      {#if bare}
        {@render children()}
      {:else}
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pb-4 pt-5 dark:border-line-dark">
          <div>
            <h2 class="text-[1rem] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            {#if subtitle}<p class="mt-0.5 text-[0.8125rem] text-slate-500">{subtitle}</p>{/if}
          </div>
          <button type="button" class="btn btn-ghost -mr-2 -mt-1 h-8 w-8 px-0" onclick={close} aria-label="Schließen">
            <Icon name="x" size={16} />
          </button>
        </header>
        <div class="px-6 py-5">{@render children()}</div>
      {/if}
      {#if footer}
        <footer class="flex items-center justify-end gap-2 rounded-b-card border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-line-dark dark:bg-white/[0.02]">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}
