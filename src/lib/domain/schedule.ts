import { daysBetween } from './dashboard';
import { isoWeek } from './rules';
import type { Assessment, AssessmentType, Core, Course, SchoolClass, SchoolYear } from './types';

/** Termine (geplante Leistungsnachweise) für die Startseite. Datumsangaben als YYYY-MM-DD. */

export interface Appointment {
  cls: SchoolClass;
  course: Course;
  assessment: Assessment;
  /** Tage bis zum Termin (0 = heute). */
  days: number;
}

/** Anstehende Leistungsnachweise ab heute, chronologisch. */
export function upcomingAppointments(classes: SchoolClass[], today: string): Appointment[] {
  return classes
    .flatMap((cls) => cls.courses.flatMap((course) => course.assessments.map((assessment) => ({ cls, course, assessment, days: daysBetween(today, assessment.date) }))))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.assessment.date.localeCompare(b.assessment.date) || a.cls.name.localeCompare(b.cls.name, 'de'));
}

export interface PlanningHint {
  level: 'warn' | 'info';
  text: string;
  rule?: string;
}

/** Mindestvorlauf für angekündigte Leistungsnachweise in Tagen. */
export const ANNOUNCE_DAYS = 7;

/**
 * Prüft einen geplanten Termin vor dem Anlegen: Vorlauf, Schuljahr,
 * Tages- und Wochengrenzen in der Klasse und die Zahl der Schulaufgaben.
 * Berücksichtigt wie die übrigen Hinweise nur die eigenen Kurse der Klasse.
 */
export function planningHints(
  cls: SchoolClass,
  course: Course,
  type: AssessmentType,
  date: string,
  core: Core,
  year: SchoolYear | undefined,
  today: string,
): PlanningHint[] {
  const out: PlanningHint[] = [];
  const types = new Map(core.types.map((t) => [t.id, t]));
  const subj = (c: Course) => core.subjects.find((s) => s.id === c.subjectId)?.short ?? '?';
  const fmt = new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

  if (date < today) out.push({ level: 'info', text: 'Das Datum liegt in der Vergangenheit – der Leistungsnachweis gilt als bereits geschrieben.' });
  if (year && (date < year.start || date > year.end)) out.push({ level: 'warn', text: `Das Datum liegt außerhalb des Schuljahres ${year.name}.` });

  const lead = daysBetween(today, date);
  if (type.announced && date >= today && lead < ANNOUNCE_DAYS) {
    out.push({
      level: 'warn',
      text: `${type.short} müssen mindestens eine Woche vorher angekündigt werden – bis zum Termin sind es nur ${lead} Tag${lead === 1 ? '' : 'e'}.`,
      rule: 'RSO § 18 Abs. 7, § 19',
    });
  }

  const others = cls.courses.flatMap((c) =>
    c.assessments.map((a) => ({ a, c, t: types.get(a.typeId) })).filter((x): x is { a: Assessment; c: Course; t: AssessmentType } => !!x.t),
  );
  const sameDay = others.filter((x) => x.a.date === date);
  const limitedSameDay = sameDay.filter((x) => x.t.countsForDayLimit);
  const label = (x: { a: Assessment; c: Course; t: AssessmentType }) => `${x.t.short} ${subj(x.c)}`;

  if (type.countsForDayLimit && limitedSameDay.length) {
    out.push({
      level: 'warn',
      text: `Am ${fmt} ist in der ${cls.name} schon ${limitedSameDay.map(label).join(', ')} angesetzt – höchstens ein angekündigter Leistungsnachweis pro Tag.`,
      rule: 'RSO § 17 Abs. 3 Satz 2',
    });
  }
  if (type.kind === 'stegreifaufgabe' && limitedSameDay.length) {
    out.push({ level: 'warn', text: `Am ${fmt} ist ${limitedSameDay.map(label).join(', ')} angekündigt – an diesem Tag keine Stegreifaufgabe.`, rule: 'RSO § 17 Abs. 3 Satz 3' });
  }
  if (type.countsForDayLimit && sameDay.some((x) => x.t.kind === 'stegreifaufgabe')) {
    out.push({ level: 'warn', text: `Am ${fmt} ist bereits eine Stegreifaufgabe eingetragen.`, rule: 'RSO § 17 Abs. 3 Satz 3' });
  }

  if (type.countsForDayLimit) {
    const week = isoWeek(date);
    const inWeek = others.filter((x) => x.t.countsForDayLimit && isoWeek(x.a.date) === week);
    const total = inWeek.length + 1;
    const sa = inWeek.filter((x) => x.t.kind === 'schulaufgabe').length + (type.kind === 'schulaufgabe' ? 1 : 0);
    if (total > 3 || sa > 2) {
      out.push({
        level: 'info',
        text: `Damit wären es ${total} angekündigte Leistungsnachweise in ${week.replace(/^\d+-/, '')}${sa > 2 ? `, davon ${sa} Schulaufgaben` : ''} – empfohlen sind höchstens drei, davon zwei Schulaufgaben.`,
        rule: 'RSO § 17 Abs. 3 Satz 2',
      });
    }
  }

  if (type.kind === 'schulaufgabe' && !course.testModel && course.plannedSchulaufgaben > 0) {
    const n = course.assessments.filter((a) => {
      const k = types.get(a.typeId)?.kind;
      return k === 'schulaufgabe' || k === 'ersatz_schulaufgabe';
    }).length;
    if (n + 1 > course.plannedSchulaufgaben) {
      out.push({ level: 'warn', text: `Für dieses Fach sind ${course.plannedSchulaufgaben} Schulaufgaben vorgesehen, das wäre die ${n + 1}.`, rule: 'RSO § 18 Abs. 1' });
    }
  }
  return out;
}

/** Vorschlag für den Titel: „2. Schulaufgabe“ usw. */
export function nextAssessmentTitle(course: Course, type: AssessmentType): string {
  const n = course.assessments.filter((a) => a.typeId === type.id).length + 1;
  return `${n}. ${type.name.replace(/ \(.*\)$/, '')}`;
}
