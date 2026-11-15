<script lang="ts">
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { toast } from '../lib/state/toast.svelte';
  import Icon from './Icon.svelte';
</script>

<div class="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2 no-print" aria-live="polite">
  {#each toast.items as t (t.id)}
    <div
      animate:flip={{ duration: 200 }}
      in:fly={{ y: 16, duration: 220 }}
      out:fly={{ x: 40, duration: 180 }}
      class="glass pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lift"
    >
      <span
        class="mt-0.5 grid h-6 w-6 place-items-center rounded-full {t.kind === 'success'
          ? 'bg-emerald-500/15 text-emerald-600'
          : t.kind === 'error'
            ? 'bg-rose-500/15 text-rose-600'
            : 'bg-brand-500/15 text-brand-600'}"
      >
        <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} size={14} stroke={2.25} />
      </span>
      <p class="flex-1 text-[13px] leading-snug text-slate-700 dark:text-slate-200">{t.text}</p>
      <button class="text-slate-400 hover:text-slate-600" onclick={() => toast.dismiss(t.id)} aria-label="Ausblenden">
        <Icon name="x" size={14} />
      </button>
    </div>
  {/each}
</div>
