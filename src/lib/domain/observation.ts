import type { Course, Observation, ObservationPhase } from './types';

/** Offene Beobachtungsphase eines Schülers im Kurs (höchstens eine). */
export function openPhase(course: Course, studentId: string): ObservationPhase | undefined {
  return course.observations?.find((p) => p.studentId === studentId && !p.closedAt);
}

/** Beginn der Phase: Starttag oder, falls früher, Tag der ersten Beobachtung (YYYY-MM-DD). */
export function phaseSince(p: ObservationPhase): string {
  const start = p.startedAt.slice(0, 10);
  const first = p.entries.reduce((m, e) => (e.at < m ? e.at : m), start);
  return first;
}

/** Abgeschlossene Phasen eines Schülers, neueste zuerst. */
export function closedPhases(course: Course, studentId: string): ObservationPhase[] {
  return (course.observations ?? [])
    .filter((p) => p.studentId === studentId && p.closedAt)
    .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!));
}

/** Beobachtungen chronologisch (älteste zuerst, bei gleichem Tag nach Erfassung). */
export function chronological(entries: Observation[]): Observation[] {
  return [...entries].sort((a, b) => a.at.localeCompare(b.at) || a.createdAt.localeCompare(b.createdAt));
}

export interface ObservationStats {
  count: number;
  first: string | null;
  last: string | null;
  /** Kalendertage vom ersten bis zum letzten Beobachtungstag. */
  days: number;
  avg: number | null;
}

export function observationStats(entries: Observation[]): ObservationStats {
  if (!entries.length) return { count: 0, first: null, last: null, days: 0, avg: null };
  const dates = entries.map((e) => e.at).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const days = Math.round((Date.parse(`${last}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86_400_000);
  const avg = entries.reduce((s, e) => s + e.stars, 0) / entries.length;
  return { count: entries.length, first, last, days, avg };
}

/**
 * Orientierung für die Note aus dem Sterne-Durchschnitt: 5 Sterne ≈ 1, 1 Stern ≈ 5.
 * Liegt der Wert zwischen zwei Noten, werden beide genannt (z. B. „2–3“).
 */
export function starsToGradeHint(avg: number | null): string {
  if (avg === null) return '';
  const g = 6 - avg;
  const lo = Math.floor(g + 1e-9);
  const hi = Math.ceil(g - 1e-9);
  const near = Math.round(g);
  if (Math.abs(g - near) <= 0.25) return String(near);
  return `${lo}–${hi}`;
}
