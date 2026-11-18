import { entriesFor, halfOf, needsReplacement, summarize, type Ctx } from './grading';
import { activeStudents, minSmallPerHalf, studentCompleteness } from './rules';
import type { Assessment, Course, Grade, Half, ReportTerm, SchoolClass, SchoolYear, Student } from './types';

/** Auswertungen für die Startseite. Alle Datumsangaben als YYYY-MM-DD. */

const DAY = 86_400_000;

/** Ganze Kalendertage von `from` bis `to` (negativ, wenn `to` früher liegt). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T12:00:00Z`) - Date.parse(`${from.slice(0, 10)}T12:00:00Z`)) / DAY);
}

/** „heute“, „morgen“, „in 3 Tagen“, „vor 2 Tagen“. */
export function relativeDays(n: number): string {
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n === -1) return 'gestern';
  return n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;
}

// ---------- Leistungsnachweise, bei denen Noten fehlen ----------

export interface PendingGrading {
  cls: SchoolClass;
  course: Course;
  assessment: Assessment;
  entered: number;
  total: number;
  /** Tage seit dem Leistungsnachweis. */
  age: number;
}

/**
 * Vergangene Leistungsnachweise, bei denen noch nicht für alle teilnehmenden
 * Schülerinnen und Schüler etwas eingetragen ist (Note, Status oder Nachtermin).
 */
export function pendingGrading(classes: SchoolClass[], today: string): PendingGrading[] {
  const out: PendingGrading[] = [];
  for (const cls of classes) {
    for (const course of cls.courses) {
      const ids = new Set(activeStudents(cls, course).map((s) => s.id));
      if (!ids.size) continue;
      for (const a of course.assessments) {
        if (a.date > today) continue;
        const entered = new Set(course.grades.filter((g) => g.assessmentId === a.id && ids.has(g.studentId)).map((g) => g.studentId)).size;
        if (entered < ids.size) out.push({ cls, course, assessment: a, entered, total: ids.size, age: daysBetween(a.date, today) });
      }
    }
  }
  return out.sort((x, y) => x.assessment.date.localeCompare(y.assessment.date));
}

// ---------- Offene Nachtermine und Ersatznoten ----------

export interface OpenMakeup {
  cls: SchoolClass;
  course: Course;
  student: Student;
  grade: Grade;
  assessment: Assessment | undefined;
  /** Nachtermin offen oder Ersatznote für einen versäumten Nachweis ohne Nachtermin. */
  kind: 'nachtermin' | 'ersatz';
  /** Datum des versäumten Leistungsnachweises. */
  since: string;
  age: number;
}

export function openMakeups(classes: SchoolClass[], today: string): OpenMakeup[] {
  const out: OpenMakeup[] = [];
  for (const cls of classes) {
    for (const course of cls.courses) {
      const active = new Map(activeStudents(cls, course).map((s) => [s.id, s]));
      const byId = new Map(course.assessments.map((a) => [a.id, a]));
      for (const g of course.grades) {
        const student = active.get(g.studentId);
        if (!student) continue;
        const a = g.assessmentId ? byId.get(g.assessmentId) : undefined;
        if (g.assessmentId && !a) continue;
        let kind: OpenMakeup['kind'] | null = null;
        if (g.status === 'nachtermin') kind = 'nachtermin';
        else if (needsReplacement(g) && !course.grades.some((r) => !r.assessmentId && r.studentId === g.studentId && r.replacesAssessmentId === g.assessmentId))
          kind = 'ersatz';
        if (!kind) continue;
        const since = a ? a.date : g.performedAt.slice(0, 10);
        out.push({ cls, course, student, grade: g, assessment: a, kind, since, age: daysBetween(since, today) });
      }
    }
  }
  return out.sort((x, y) => x.since.localeCompare(y.since));
}

// ---------- Schülerinnen und Schüler mit Handlungsbedarf ----------

export interface AtRisk {
  cls: SchoolClass;
  course: Course;
  student: Student;
  /** Schnitt im Schuljahr bisher (null ohne Noten). */
  avg: number | null;
  reasons: Array<'schnitt' | 'wenige'>;
  /** Kleine Leistungsnachweise im laufenden Halbjahr. */
  small: number;
  minSmall: number;
}

/** Ab diesem Schnitt gilt die Leistung als gefährdet (Note 5 droht). */
export const RISK_AVG = 4.5;
/** Ab diesem Anteil des Halbjahres werden zu wenige kleine Leistungsnachweise gemeldet. */
export const LOW_COUNT_FROM = 0.5;

export function atRisk(classes: SchoolClass[], ctx: Ctx, today: string): AtRisk[] {
  const half = halfOf(today, ctx.year);
  const progress = halfProgress(ctx.year, today);
  const out: AtRisk[] = [];
  for (const cls of classes) {
    for (const course of cls.courses) {
      const minSmall = minSmallPerHalf(course);
      for (const student of activeStudents(cls, course)) {
        const year = entriesFor(course, student.id, ctx, 'jahr');
        const avg = summarize(year).total;
        const small = year.filter((e) => e.half === half && e.category === 'klein').length;
        const reasons: AtRisk['reasons'] = [];
        if (avg !== null && avg >= RISK_AVG) reasons.push('schnitt');
        if (progress >= LOW_COUNT_FROM && small < minSmall) reasons.push('wenige');
        if (reasons.length) out.push({ cls, course, student, avg, reasons, small, minSmall });
      }
    }
  }
  // Gefährdete Schnitte zuerst (schlechteste oben), dann fehlende Noten.
  return out.sort((a, b) => (b.avg !== null && b.avg >= RISK_AVG ? b.avg : 0) - (a.avg !== null && a.avg >= RISK_AVG ? a.avg : 0) || a.small - b.small);
}

// ---------- Schuljahr und Zeugnisse ----------

export interface YearProgress {
  half: Half;
  /** Anteil des Schuljahres (0–1). */
  year: number;
  /** Anteil des laufenden Halbjahres (0–1). */
  halfShare: number;
  /** Lage des Halbjahreswechsels auf der Jahresleiste (0–1). */
  switchAt: number;
  daysLeftInHalf: number;
  before: boolean;
  after: boolean;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function halfProgress(year: SchoolYear, today: string): number {
  const h = halfOf(today, year);
  const start = h === 1 ? year.start : year.halfSwitch;
  const end = h === 1 ? year.halfSwitch : year.end;
  const len = daysBetween(start, end);
  return len > 0 ? clamp(daysBetween(start, today) / len) : 0;
}

export function yearProgress(year: SchoolYear, today: string): YearProgress {
  const len = Math.max(1, daysBetween(year.start, year.end));
  const half = halfOf(today, year);
  const endOfHalf = half === 1 ? year.halfSwitch : year.end;
  return {
    half,
    year: clamp(daysBetween(year.start, today) / len),
    halfShare: halfProgress(year, today),
    switchAt: clamp(daysBetween(year.start, year.halfSwitch) / len),
    // Das 1. Halbjahr endet am Tag vor dem Wechsel.
    daysLeftInHalf: Math.max(0, daysBetween(today, endOfHalf) - (half === 1 ? 1 : 0)),
    before: today < year.start,
    after: today > year.end,
  };
}

/** Kurzbezeichnung einer Lücke aus `studentCompleteness` (ohne Halbjahr und Zahlen). */
export function gapLabel(m: string): { text: string; courseWide: boolean } {
  const t = m.replace(/^\d\. Hj\.: /, '');
  if (/Schulaufgaben|angesagten Tests/.test(t)) return { text: t, courseWide: true };
  if (t.includes('kleinen')) return { text: 'kleine Noten fehlen', courseWide: false };
  if (t.includes('mündlich')) return { text: 'mündliche Note fehlt', courseWide: false };
  if (t.includes('ohne Note')) return { text: 'Noten nicht eingetragen', courseWide: false };
  if (t.includes('Ersatznote')) return { text: 'Ersatznote offen', courseWide: false };
  if (t.includes('Nachtermin')) return { text: 'Nachtermin offen', courseWide: false };
  return { text: t, courseWide: false };
}

export interface CourseReportState {
  cls: SchoolClass;
  course: Course;
  complete: number;
  total: number;
  /** Häufigste Lücken, mit Anzahl betroffener Schüler (ohne Namen). */
  missing: string[];
}

export interface ReportStatus {
  term: ReportTerm;
  /** Ausgabetag: Halbjahreswechsel bzw. Ende des Schuljahres. */
  date: string;
  daysLeft: number;
  courses: CourseReportState[];
}

/**
 * Nächstes Zeugnis und für jeden Kurs, bei wie vielen Schülerinnen und Schülern
 * alle nach RSO nötigen Noten vorliegen (für das Halbjahr bzw. das ganze Jahr).
 */
export function reportStatus(classes: SchoolClass[], ctx: Ctx, today: string): ReportStatus | null {
  const year = ctx.year;
  if (today > year.end) return null;
  const term: ReportTerm = today < year.halfSwitch ? 'zwischen' : 'jahr';
  const date = term === 'zwischen' ? year.halfSwitch : year.end;
  const courses: CourseReportState[] = [];
  for (const cls of classes) {
    for (const course of cls.courses) {
      const students = activeStudents(cls, course);
      if (!students.length) continue;
      const tally = new Map<string, number>();
      const courseWide = new Set<string>();
      let complete = 0;
      for (const s of students) {
        const c = studentCompleteness(course, s.id, ctx, term === 'zwischen' ? 1 : 'jahr');
        if (c.complete) complete++;
        for (const m of c.missing) {
          const label = gapLabel(m);
          if (label.courseWide) courseWide.add(label.text);
          else tally.set(label.text, (tally.get(label.text) ?? 0) + 1);
        }
      }
      const missing = [
        ...courseWide,
        ...[...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`),
      ].slice(0, 2);
      courses.push({ cls, course, complete, total: students.length, missing });
    }
  }
  courses.sort((a, b) => a.complete / a.total - b.complete / b.total);
  return { term, date, daysLeft: daysBetween(today, date), courses };
}

// ---------- Datensicherung ----------

/** Ab so vielen Tagen ohne Sicherung warnt die Startseite. */
export const BACKUP_WARN_DAYS = 7;

export function backupAge(lastAt: Date | null, now = new Date()): number | null {
  if (!lastAt) return null;
  return Math.floor((now.getTime() - lastAt.getTime()) / DAY);
}
