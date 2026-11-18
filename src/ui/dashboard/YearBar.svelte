<script lang="ts">
  import { yearProgress } from '../../lib/domain/dashboard';
  import { fmtShortDate } from '../../lib/state/actions';
  import type { SchoolYear } from '../../lib/domain/types';

  /** Schmale Leiste: Wo steht das Schuljahr, wie viele Tage bleiben im Halbjahr? */
  let { year, today }: { year: SchoolYear; today: string } = $props();

  const p = $derived(yearProgress(year, today));
  const label = $derived(
    p.before
      ? `Schuljahr ${year.name} beginnt am ${fmtShortDate(year.start)}`
      : p.after
        ? `Schuljahr ${year.name} ist beendet`
        : `${p.half}. Halbjahr · noch ${p.daysLeftInHalf} Tag${p.daysLeftInHalf === 1 ? '' : 'e'}`,
  );
</script>

<div class="flex items-center gap-4" title="Schuljahr {year.name}: {fmtShortDate(year.start)} – {fmtShortDate(year.end)}, Halbjahreswechsel {fmtShortDate(year.halfSwitch)}">
  <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
    <div class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style="width: {p.year * 100}%"></div>
    <div class="absolute inset-y-0 w-0.5 bg-white dark:bg-canvas-dark" style="left: {p.switchAt * 100}%"></div>
  </div>
  <span class="whitespace-nowrap text-[0.75rem] tabular-nums text-slate-500">{label} · {Math.round(p.year * 100)} % des Jahres</span>
</div>
