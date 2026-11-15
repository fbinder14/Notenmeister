import type { GradeKey, GradeValue } from './types';

/**
 * Mindestpunktzahl je Note 1–5 für eine gegebene Höchstpunktzahl.
 * Die Grenzen werden auf die Schrittweite des Schlüssels aufgerundet,
 * damit z. B. 46,25 Punkte nicht als 46 gelten.
 */
export function pointThresholds(key: GradeKey, maxPoints: number): number[] {
  return key.thresholds.map((pct) => {
    const raw = (maxPoints * pct) / 100;
    const steps = Math.ceil(raw / key.step - 1e-9);
    return Math.min(maxPoints, steps * key.step);
  });
}

export function gradeFromPoints(points: number, maxPoints: number, key: GradeKey): GradeValue {
  if (!(maxPoints > 0)) throw new Error('Höchstpunktzahl fehlt.');
  const limits = pointThresholds(key, maxPoints);
  for (let i = 0; i < limits.length; i++) {
    if (points >= limits[i] - 1e-9) return (i + 1) as GradeValue;
  }
  return 6;
}

/** Punktbereiche je Note für die Anzeige, z. B. „46–40“. */
export function pointRanges(key: GradeKey, maxPoints: number): Array<{ grade: GradeValue; from: number; to: number }> {
  const limits = pointThresholds(key, maxPoints);
  const out: Array<{ grade: GradeValue; from: number; to: number }> = [];
  let upper = maxPoints;
  for (let i = 0; i < 5; i++) {
    out.push({ grade: (i + 1) as GradeValue, from: upper, to: limits[i] });
    upper = limits[i] - key.step;
  }
  out.push({ grade: 6, from: Math.max(0, upper), to: 0 });
  return out;
}

export function validateThresholds(t: number[]): string | null {
  if (t.length !== 5) return 'Es werden genau fünf Grenzen benötigt.';
  for (let i = 0; i < 5; i++) {
    if (!(t[i] >= 0 && t[i] <= 100)) return 'Grenzen müssen zwischen 0 und 100 % liegen.';
    if (i > 0 && t[i] >= t[i - 1]) return 'Jede Grenze muss kleiner sein als die vorherige.';
  }
  return null;
}
