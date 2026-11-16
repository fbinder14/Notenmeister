<script lang="ts">
  import type { GradeStatus } from '../lib/domain/types';
  import { STATUS_SHORT } from '../lib/state/actions';
  import { GRADE_CLASS } from './colors';

  let {
    value,
    status = 'gewertet',
    size = 'md',
    title = '',
    pop = false,
  }: { value: number | null; status?: GradeStatus; size?: 'sm' | 'md' | 'lg'; title?: string; pop?: boolean } = $props();

  const dims = { sm: 'h-6 min-w-6 text-[0.75rem] rounded-md', md: 'h-7 min-w-7 text-[0.8125rem] rounded-lg', lg: 'h-10 min-w-10 text-[1.0625rem] rounded-xl' };
</script>

{#if status === 'nachtermin'}
  <span {title} class="inline-flex items-center justify-center px-1.5 font-semibold ring-1 ring-inset {dims[size]} bg-violet-100 text-violet-700 ring-violet-300/60 dark:bg-violet-500/15 dark:text-violet-300">NT</span>
{:else if status === 'nicht_gewertet'}
  <span {title} class="inline-flex items-center justify-center px-1.5 font-semibold text-slate-400 line-through ring-1 ring-inset ring-slate-200 {dims[size]} dark:ring-line-dark">{value ?? '–'}</span>
{:else if value}
  <span
    {title}
    class="relative inline-flex items-center justify-center px-1.5 font-semibold tabular-nums ring-1 ring-inset {dims[size]} {GRADE_CLASS[value]} {pop ? 'animate-pop' : ''}"
  >
    {value}
    {#if STATUS_SHORT[status]}
      <sup class="absolute -right-1 -top-1.5 rounded bg-slate-900 px-0.5 text-[0.5rem] font-bold leading-[11px] text-white dark:bg-white dark:text-slate-900">{STATUS_SHORT[status]}</sup>
    {/if}
  </span>
{/if}
