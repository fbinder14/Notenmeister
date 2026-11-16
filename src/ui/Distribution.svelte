<script lang="ts">
  import { distribution, formatAvg } from '../lib/domain/grading';
  import { GRADE_BAR } from './colors';

  let { values }: { values: number[] } = $props();
  const d = $derived(distribution(values));
  const max = $derived(Math.max(1, ...d.counts));
</script>

<div>
  <div class="flex h-36 items-end gap-2">
    {#each d.counts as c, i (i)}
      <div class="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
        <span class="text-[0.75rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{c || ''}</span>
        <div class="flex w-full flex-1 items-end">
          <div
            class="w-full rounded-t-lg {GRADE_BAR[i + 1]} transition-all duration-500 ease-out"
            style="height: {c ? Math.max(6, (c / max) * 100) : 2}%; opacity: {c ? 0.85 : 0.15}"
          ></div>
        </div>
      </div>
    {/each}
  </div>
  <div class="mt-1.5 flex gap-2 border-t border-slate-100 pt-1.5 dark:border-line-dark">
    {#each [1, 2, 3, 4, 5, 6] as g (g)}<span class="flex-1 text-center text-[0.75rem] font-semibold text-slate-500">{g}</span>{/each}
  </div>
  <div class="mt-4 grid grid-cols-2 gap-3">
    <div class="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
      <div class="text-[0.6875rem] text-slate-500">Schnitt</div>
      <div class="text-[1.25rem] font-semibold tabular-nums text-slate-900 dark:text-white">{formatAvg(d.avg)}</div>
    </div>
    <div class="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
      <div class="text-[0.6875rem] text-slate-500">Bewertet</div>
      <div class="text-[1.25rem] font-semibold tabular-nums text-slate-900 dark:text-white">{d.n}</div>
    </div>
  </div>
</div>
