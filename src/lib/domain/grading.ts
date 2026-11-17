import type {
  Assessment,
  AssessmentType,
  Category,
  Course,
  Grade,
  GradeValue,
  Half,
  Mode,
  Period,
  Rounding,
  SchoolYear,
} from './types';

/** Note zählt in den Schnitt (gewertet oder Note 6 wegen Versäumnis/Verweigerung/Unterschleif). */
export function counts(g: Grade): boolean {
  if (g.value === null) return false;
  return g.status === 'gewertet' || g.status === 'versaeumt' || g.status === 'verweigert' || g.status === 'unterschleif';
}

/**
 * Versäumter Leistungsnachweis ohne Nachtermin: „nicht gewertet“ ohne Note.
 * Hier ist stattdessen eine Ersatznote (z. B. Rechenschaftsablage) erforderlich.
 */
export function needsReplacement(g: Grade | undefined): boolean {
  return !!g && !!g.assessmentId && g.status === 'nicht_gewertet' && g.value === null;
}

/** Einzelnote, die den versäumten Leistungsnachweis ersetzt. */
export function replacementFor(course: Course, assessmentId: string, studentId: string): Grade | undefined {
  return course.grades.find((g) => !g.assessmentId && g.studentId === studentId && g.replacesAssessmentId === assessmentId);
}

export function halfOf(dateIso: string, year: SchoolYear): Half {
  return dateIso.slice(0, 10) < year.halfSwitch ? 1 : 2;
}

export interface Entry {
  grade: Grade;
  value: GradeValue;
  weight: number;
  category: Category;
  mode: Mode;
  half: Half;
  type: AssessmentType | undefined;
  assessment: Assessment | undefined;
}

export interface Ctx {
  types: Map<string, AssessmentType>;
  year: SchoolYear;
}

export function gradeDate(g: Grade, a: Assessment | undefined): string {
  return a ? a.date : g.performedAt.slice(0, 10);
}

export function typeOf(g: Grade, a: Assessment | undefined, ctx: Ctx): AssessmentType | undefined {
  return ctx.types.get(a ? a.typeId : (g.typeId ?? ''));
}

export function weightOf(g: Grade, a: Assessment | undefined, t: AssessmentType | undefined): number {
  if (a) return a.weight ?? t?.weight ?? 1;
  return g.weight ?? t?.weight ?? 1;
}

/** Alle wertbaren Einträge eines Schülers in einem Kurs, optional auf ein Halbjahr begrenzt. */
export function entriesFor(course: Course, studentId: string, ctx: Ctx, period: Period = 'jahr'): Entry[] {
  const byId = new Map(course.assessments.map((a) => [a.id, a]));
  const out: Entry[] = [];
  for (const g of course.grades) {
    if (g.studentId !== studentId || !counts(g)) continue;
    const a = g.assessmentId ? byId.get(g.assessmentId) : undefined;
    if (g.assessmentId && !a) continue;
    const t = typeOf(g, a, ctx);
    const half = halfOf(gradeDate(g, a), ctx.year);
    if (period !== 'jahr' && half !== period) continue;
    out.push({
      grade: g,
      value: g.value as GradeValue,
      weight: weightOf(g, a, t),
      category: t?.category ?? 'klein',
      mode: t?.mode ?? 'schriftlich',
      half,
      type: t,
      assessment: a,
    });
  }
  return out;
}

export function weightedAverage(entries: Array<{ value: number; weight: number }>): number | null {
  let sum = 0;
  let w = 0;
  for (const e of entries) {
    if (e.weight <= 0) continue;
    sum += e.value * e.weight;
    w += e.weight;
  }
  return w > 0 ? sum / w : null;
}

export interface Summary {
  total: number | null;
  countBig: number;
  countSmall: number;
  countOral: number;
}

/**
 * Jahresfortgangsnote nach RSO § 23: gewichteter Schnitt aller Leistungsnachweise.
 */
export function summarize(entries: Entry[]): Summary {
  const big = entries.filter((e) => e.category === 'gross');
  const small = entries.filter((e) => e.category === 'klein');
  return {
    total: weightedAverage(entries),
    countBig: big.length,
    countSmall: small.length,
    countOral: small.filter((e) => e.mode === 'muendlich').length,
  };
}

/**
 * Vorschlag für die Zeugnisnote. „streng“: x,50 ergibt die schlechtere Note;
 * „mild“: x,50 ergibt die bessere Note. Die Entscheidung trifft die Lehrkraft.
 */
export function suggestGrade(avg: number | null, rounding: Rounding): GradeValue | null {
  if (avg === null) return null;
  const frac = avg - Math.floor(avg);
  let g: number;
  if (Math.abs(frac - 0.5) < 1e-9) g = rounding === 'streng' ? Math.ceil(avg) : Math.floor(avg);
  else g = Math.round(avg);
  return Math.min(6, Math.max(1, g)) as GradeValue;
}

export function formatAvg(avg: number | null): string {
  if (avg === null) return '–';
  return (Math.floor(avg * 100 + 1e-9) / 100).toFixed(2).replace('.', ',');
}

/** Notenspiegel: Anzahl je Note 1–6 und Schnitt. */
export function distribution(values: number[]): { counts: number[]; avg: number | null; n: number } {
  const c = [0, 0, 0, 0, 0, 0];
  for (const v of values) if (v >= 1 && v <= 6) c[v - 1]++;
  const n = values.length;
  return { counts: c, avg: n ? values.reduce((a, b) => a + b, 0) / n : null, n };
}
