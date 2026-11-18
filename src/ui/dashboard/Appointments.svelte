<script lang="ts">
  import { relativeDays } from '../../lib/domain/dashboard';
  import { upcomingAppointments } from '../../lib/domain/schedule';
  import { fmtShortDate, subjectOf, typeById } from '../../lib/state/actions';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';
  import { SUBJECT_DOT } from '../colors';
  import AppointmentsModal from './AppointmentsModal.svelte';

  /**
   * Kachel „Termine“: die nächsten angesetzten Leistungsnachweise mit
   * Countdown. Ein Klick öffnet alle Termine mit Details und Eintragung.
   */
  let { classes, today }: { classes: SchoolClass[]; today: string } = $props();

  const SHOW = 5;

  let open = $state(false);
  let focus = $state<string | null>(null);
  let adding = $state(false);

  const items = $derived(upcomingAppointments(classes, today));

  function show(id: string | null = null, add = false) {
    focus = id;
    adding = add;
    open = true;
  }

  const chip = (d: number) =>
    d === 0
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
      : d <= 2
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : d <= 7
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
          : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300';
</script>

<section>
  <div class="mb-3 flex items-center gap-2">
    <h2 class="flex-1 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Termine</h2>
    <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={() => show(null, true)}><Icon name="plus" size={14} /> Termin eintragen</button>
  </div>
  <div class="card divide-y divide-slate-100 overflow-hidden dark:divide-line-dark">
    {#each items.slice(0, SHOW) as { cls, course, assessment: a, days } (a.id)}
      {@const s = subjectOf(course)}
      <button type="button" onclick={() => show(a.id)} class="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
        <div class="w-12 shrink-0 text-center">
          <div class="text-[0.9375rem] font-semibold tabular-nums text-slate-900 dark:text-white">{fmtShortDate(a.date)}</div>
          <div class="text-[0.6875rem] text-slate-400">{new Date(`${a.date}T12:00`).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[0.8125rem] font-medium">{a.title}</div>
          <div class="flex min-w-0 items-center gap-1.5 text-[0.75rem] text-slate-500">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
            <span class="truncate">{cls.name} · {s?.name} · {typeById(a.typeId)?.short}</span>
          </div>
        </div>
        <span class="whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-medium {chip(days)}">{relativeDays(days)}</span>
      </button>
    {:else}
      <div class="flex items-center gap-3 px-4 py-4">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5"><Icon name="clock" size={17} /></span>
        <p class="flex-1 text-[0.8125rem] text-slate-500">Keine Termine geplant. Trag Schulaufgaben, Kurzarbeiten und Tests ein, sobald sie feststehen.</p>
      </div>
    {/each}
    {#if items.length > SHOW}
      <button type="button" onclick={() => show()} class="w-full px-4 py-2 text-left text-[0.75rem] font-medium text-brand-600 transition hover:bg-slate-50 dark:text-brand-300 dark:hover:bg-white/[0.03]">
        Alle {items.length} Termine anzeigen
      </button>
    {/if}
  </div>
</section>

<AppointmentsModal bind:open {classes} {today} {focus} {adding} />
