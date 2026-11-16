<script lang="ts">
  import type { Warning } from '../lib/domain/rules';
  import { href } from '../lib/state/router.svelte';
  import Icon from './Icon.svelte';

  let { warnings, compact = false }: { warnings: Warning[]; compact?: boolean } = $props();
</script>

{#if warnings.length}
  <div class="grid gap-2">
    {#each warnings as w, i (w.id)}
      <svelte:element
        this={w.courseId ? 'a' : 'div'}
        href={w.courseId ? href.course(w.classId, w.courseId) : undefined}
        class="flex gap-3 rounded-2xl border p-3.5 transition animate-fade-up {w.severity === 'warn'
          ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/[0.07]'
          : 'border-slate-200 bg-white/70 hover:bg-white dark:border-line-dark dark:bg-white/[0.03]'}"
        style="animation-delay: {Math.min(i, 8) * 30}ms"
      >
        <span class="mt-0.5 {w.severity === 'warn' ? 'text-amber-500' : 'text-sky-500'}"><Icon name={w.severity === 'warn' ? 'alert' : 'info'} size={16} /></span>
        <div class="min-w-0 flex-1">
          <div class="text-[0.8125rem] font-medium leading-snug text-slate-800 dark:text-slate-100">{w.title}</div>
          {#if !compact && w.detail}<div class="mt-0.5 text-[0.75rem] leading-snug text-slate-500">{w.detail}</div>{/if}
          <div class="mt-1 text-[0.6875rem] font-medium text-slate-400">{w.rule}</div>
        </div>
      </svelte:element>
    {/each}
  </div>
{:else}
  <div class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-[0.8125rem] text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07] dark:text-emerald-200">
    <Icon name="check" size={16} /> Alles in Ordnung – keine offenen Hinweise.
  </div>
{/if}
