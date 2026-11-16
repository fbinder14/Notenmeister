import type { LogEntry, SchoolClass } from './types';

/** Aufbewahrung: höchstens so viele Tage und Einträge je Klasse. */
export const LOG_DAYS = 30;
export const LOG_MAX = 400;
/** Noten zum selben Nachweis innerhalb dieser Spanne gelten als eine Sammeleingabe. */
export const GROUP_WINDOW_MS = 30 * 60_000;
/** Ab so vielen Noten wird eine Sammeleingabe zu einer Zeile zusammengefasst. */
export const GROUP_MIN = 3;

/** Fügt einen Eintrag an und entfernt zu alte bzw. überzählige. */
export function appendLog(log: LogEntry[], entry: LogEntry, now = new Date(entry.at)): LogEntry[] {
  const cutoff = new Date(now.getTime() - LOG_DAYS * 86_400_000).toISOString();
  const kept = log.filter((e) => e.at >= cutoff);
  kept.push(entry);
  return kept.length > LOG_MAX ? kept.slice(kept.length - LOG_MAX) : kept;
}

export type LogItem =
  | { type: 'single'; cls: SchoolClass; e: LogEntry }
  | { type: 'group'; cls: SchoolClass; first: LogEntry; entries: LogEntry[]; at: string };

function groupKey(e: LogEntry): string | null {
  if (e.kind !== 'grade' || e.changed) return null;
  return `${e.courseId}|${e.assessmentId ?? `typ:${e.typeId}`}`;
}

/**
 * Alle Einträge aller Klassen, neueste zuerst. Neu erfasste Noten zum selben
 * Nachweis (bzw. derselben Art von Einzelnote) kurz hintereinander werden zu
 * einer Zeile zusammengefasst, ab `GROUP_MIN` Noten.
 */
export function recentLog(classes: SchoolClass[], since?: string): LogItem[] {
  const all = classes
    .flatMap((cls) => (cls.log ?? []).map((e) => ({ cls, e })))
    .filter((x) => !since || x.e.at >= since)
    .sort((a, b) => b.e.at.localeCompare(a.e.at));

  const items: LogItem[] = [];
  let i = 0;
  while (i < all.length) {
    const { cls, e } = all[i];
    const k = groupKey(e);
    let j = i + 1;
    if (k) {
      const start = new Date(e.at).getTime();
      while (j < all.length && all[j].cls === cls && groupKey(all[j].e) === k && start - new Date(all[j].e.at).getTime() <= GROUP_WINDOW_MS) j++;
    }
    if (j - i >= GROUP_MIN) {
      const entries = all.slice(i, j).map((x) => x.e);
      items.push({ type: 'group', cls, first: e, entries, at: e.at });
    } else {
      for (let m = i; m < j; m++) items.push({ type: 'single', cls: all[m].cls, e: all[m].e });
    }
    i = j;
  }
  return items;
}

export function itemTime(it: LogItem): string {
  return it.type === 'group' ? it.at : it.e.at;
}
