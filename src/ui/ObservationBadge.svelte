<script lang="ts">
  import { fmtShortDate } from '../lib/state/actions';
  import type { ObservationPhase } from '../lib/domain/types';
  import { phaseSince } from '../lib/domain/observation';
  import Icon from './Icon.svelte';

  /** Plakette einer laufenden Unterrichtsbeobachtung; führt in die Beobachtungsmaske. */
  let { phase, link, label = 'Beobachtung' }: { phase: ObservationPhase; link: string; label?: string } = $props();
  const n = $derived(phase.entries.length);
</script>

<a
  href={link}
  class="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-brand-50 px-2 text-[0.65625rem] font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
  title="Laufende Unterrichtsbeobachtung seit {fmtShortDate(phaseSince(phase))}, {n} Beobachtung{n === 1 ? '' : 'en'} – öffnen"
>
  <Icon name="eye" size={12} />
  {label} · {n} · seit {fmtShortDate(phaseSince(phase))}
</a>
