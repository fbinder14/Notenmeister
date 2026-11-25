<script lang="ts">
  import { daysBetween } from '../lib/domain/dashboard';
  import { reportDay } from '../lib/domain/calendar';
  import { fmtShortDate } from '../lib/state/actions';
  import type { SchoolYear } from '../lib/domain/types';

  /** Schuljahr als Zeitleiste: Ferien als Bänder, Zeugnisse und Notenschluss als Marken. */
  let { year, today }: { year: SchoolYear; today?: string } = $props();

  const total = $derived(Math.max(1, daysBetween(year.start, year.end)));
  const pct = (iso: string) => Math.min(100, Math.max(0, (daysBetween(year.start, iso) / total) * 100));

  const months = $derived.by(() => {
    const out: Array<{ label: string; at: number }> = [];
    const d = new Date(`${year.start}T12:00:00`);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.toISOString().slice(0, 10) <= year.end) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      out.push({ label: d.toLocaleDateString('de-DE', { month: 'narrow' }), at: pct(iso) });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  });

  const marks = $derived(
    [
      { at: reportDay(year, 'zwischen'), label: 'Zwischenzeugnis', cls: 'bg-brand-500' },
      { at: year.end, label: 'Jahreszeugnis', cls: 'bg-violet-500' },
      ...(year.reportDeadlines?.zwischen ? [{ at: year.reportDeadlines.zwischen, label: 'Notenschluss', cls: 'bg-rose-400' }] : []),
      ...(year.reportDeadlines?.jahr ? [{ at: year.reportDeadlines.jahr, label: 'Notenschluss', cls: 'bg-rose-400' }] : []),
    ].filter((m) => m.at >= year.start && m.at <= year.end),
  );
</script>

<div class="select-none">
  <div class="relative h-7">
    <div class="absolute inset-x-0 top-3 h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10"></div>
    {#each year.holidays ?? [] as h (h.start + h.name)}
      <div
        class="absolute top-2 h-3.5 rounded-[3px] bg-amber-300/80 dark:bg-amber-400/40"
        style="left: {pct(h.start)}%; width: max(3px, {pct(addOne(h.end)) - pct(h.start)}%)"
        title="{h.name}: {fmtShortDate(h.start)}–{fmtShortDate(h.end)}"
      ></div>
    {/each}
    {#if year.finalExam?.start && year.finalExam.end}
      <div class="absolute top-2 h-3.5 rounded-[3px] bg-rose-300/70 dark:bg-rose-400/40" style="left: {pct(year.finalExam.start)}%; width: {pct(year.finalExam.end) - pct(year.finalExam.start)}%" title="Abschlussprüfung"></div>
    {/if}
    {#each marks as m (m.label + m.at)}
      <div class="absolute top-0.5 h-6 w-[3px] -translate-x-1/2 rounded-full {m.cls} ring-2 ring-white dark:ring-panel-dark" style="left: {pct(m.at)}%" title="{m.label}: {fmtShortDate(m.at)}"></div>
    {/each}
    {#if today && today >= year.start && today <= year.end}
      <div class="absolute -top-0.5 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-slate-700 dark:border-t-slate-200" style="left: {pct(today)}%" title="Heute"></div>
    {/if}
  </div>
  <div class="relative mt-0.5 h-3.5 text-[0.625rem] text-slate-400">
    {#each months as m (m.at)}
      <span class="absolute -translate-x-1/2" style="left: {m.at}%">{m.label}</span>
    {/each}
  </div>
</div>

<script lang="ts" module>
  function addOne(iso: string) {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
</script>
