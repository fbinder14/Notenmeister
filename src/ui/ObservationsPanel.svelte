<script lang="ts">
  import { observationStats, phaseSince, starsToGradeHint } from '../lib/domain/observation';
  import { fmtShortDate, subjectOf, todayIso } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { SchoolClass } from '../lib/domain/types';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import ProtectedPanel from './ProtectedPanel.svelte';
  import { SUBJECT_DOT } from './colors';

  /**
   * Laufende Unterrichtsbeobachtungen aller Klassen des Schuljahres. Wie
   * „Letzte Aktionen“ zunächst verdeckt; Namen erscheinen erst nach Klick.
   */
  let { classes }: { classes: SchoolClass[] } = $props();

  /** Ab so vielen Tagen ohne neue Beobachtung wird die Phase hervorgehoben. */
  const STALE_DAYS = 14;

  const today = todayIso();
  const daysSince = (iso: string) => Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86_400_000);

  const running = $derived(
    classes
      .flatMap((cls) =>
        cls.courses.flatMap((course) =>
          (course.observations ?? [])
            .filter((p) => !p.closedAt)
            .map((p) => {
              const student = cls.students.find((s) => s.id === p.studentId);
              const stats = observationStats(p.entries);
              const since = phaseSince(p);
              return { cls, course, p, student, stats, since, idle: daysSince(stats.last ?? since) };
            }),
        ),
      )
      .filter((x) => x.student)
      .sort((a, b) => a.since.localeCompare(b.since)),
  );
  const stale = $derived(running.filter((x) => x.idle >= STALE_DAYS).length);
</script>

<ProtectedPanel
  title="Laufende Beobachtungen"
  count={running.length}
  lockedTitle="{running.length} laufende Beobachtung{running.length === 1 ? '' : 'en'}"
  lockedText={stale ? `${stale} davon seit mindestens ${STALE_DAYS} Tagen ohne neuen Eintrag. Aus Datenschutzgründen verdeckt.` : undefined}
  empty="Keine laufenden Beobachtungen. Beobachtungen startest du im Notenbuch eines Fachs, in der Klassenübersicht oder über den Schnellzugriff."
>
  {#each running as { cls, course, p, student, stats, since, idle } (p.id)}
    {@const s = subjectOf(course)}
    <a
      href={href.observation(cls.id, course.id, p.studentId)}
      class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-2.5 transition first:border-t-0 hover:bg-slate-50 dark:border-line-dark dark:hover:bg-white/[0.03]"
    >
      <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon name="eye" size={14} stroke={2} /></span>
      <div class="min-w-0">
        <div class="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{student!.lastName}, {student!.firstName}</div>
        <div class="flex items-center gap-1.5 truncate text-[0.71875rem] text-slate-500">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
          {cls.name} {s?.short} · {stats.count} Eintr{stats.count === 1 ? 'ag' : 'äge'} · seit {fmtShortDate(since)}
          {#if idle >= STALE_DAYS}<span class="text-amber-600 dark:text-amber-400">· {idle} Tage ohne Eintrag</span>{/if}
        </div>
      </div>
      <div class="flex flex-col items-end gap-0.5">
        {#if stats.avg !== null}
          <Stars value={Math.round(stats.avg * 2) / 2} size={12} />
          <span class="text-[0.6875rem] tabular-nums text-slate-400">≈ Note {starsToGradeHint(stats.avg)}</span>
        {:else}
          <span class="text-[0.6875rem] text-slate-400">noch leer</span>
        {/if}
      </div>
    </a>
  {/each}
</ProtectedPanel>
