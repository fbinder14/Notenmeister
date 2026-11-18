import { counts, entriesFor, halfOf, needsReplacement, replacementFor, type Ctx } from './grading';
import type { AssessmentType, Core, Course, Half, Period, SchoolClass, SchoolYear, Student } from './types';

export type Severity = 'warn' | 'info';

export interface Warning {
  id: string;
  severity: Severity;
  classId: string;
  courseId: string | null;
  title: string;
  detail: string;
  rule: string; // Fundstelle, z. B. „RSO § 19 Abs. 6“
}

const DAY = 86_400_000;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

export function activeStudents(cls: SchoolClass, course: Course): Student[] {
  const ex = new Set(course.excludedStudentIds);
  return cls.students.filter((s) => !ex.has(s.id) && !s.leftAt);
}

/** Mündlicher kleiner Leistungsnachweis je Halbjahr Pflicht (RSO § 19 Abs. 6 Satz 3, § 18 Abs. 3 Satz 2). */
export function needsOral(course: Course): boolean {
  return course.testModel || (course.promotionSubject && course.weeklyHours >= 2);
}

/** Mindestanzahl kleiner Leistungsnachweise je Halbjahr (RSO § 19 Abs. 6 Satz 3); im Testmodell genügt der mündliche. */
export function minSmallPerHalf(course: Course): number {
  return course.testModel ? 1 : 2;
}

export interface Completeness {
  complete: boolean;
  /** Was noch fehlt, in kurzen Sätzen. */
  missing: string[];
}

/**
 * Liegen für eine Schülerin oder einen Schüler alle nach RSO erforderlichen Noten vor?
 * Je Halbjahr: Mindestzahl kleiner Leistungsnachweise, ggf. ein mündlicher, eine Note
 * zu jedem Leistungsnachweis des Halbjahres und kein offener Nachtermin.
 * Für das Schuljahr zusätzlich die Anzahl der Schulaufgaben bzw. angesagten Tests.
 */
export function studentCompleteness(course: Course, studentId: string, ctx: Ctx, period: Period): Completeness {
  const missing: string[] = [];
  const halves: Half[] = period === 'jahr' ? [1, 2] : [period];
  const minSmall = minSmallPerHalf(course);
  const oral = needsOral(course);
  for (const h of halves) {
    const pre = period === 'jahr' ? `${h}. Hj.: ` : '';
    const small = entriesFor(course, studentId, ctx, h).filter((e) => e.category === 'klein');
    if (!course.testModel && small.length < minSmall) missing.push(`${pre}${small.length} von ${minSmall} kleinen Leistungsnachweisen`);
    if (oral && !small.some((e) => e.mode === 'muendlich')) missing.push(`${pre}mündlicher Leistungsnachweis fehlt`);
    let ungraded = 0;
    let replace = 0;
    for (const a of course.assessments) {
      if (halfOf(a.date, ctx.year) !== h) continue;
      const g = course.grades.find((x) => x.assessmentId === a.id && x.studentId === studentId);
      if (needsReplacement(g)) {
        if (!replacementFor(course, a.id, studentId)) replace++;
      } else if (!g || (g.status !== 'nicht_gewertet' && !counts(g))) ungraded++;
    }
    if (ungraded) missing.push(`${pre}${ungraded} Leistungsnachweis${ungraded === 1 ? '' : 'e'} ohne Note`);
    if (replace) missing.push(`${pre}${replace} Ersatznote${replace === 1 ? '' : 'n'} offen`);
    const openSingles = course.grades.filter(
      (g) => !g.assessmentId && g.studentId === studentId && g.status === 'nachtermin' && halfOf(g.performedAt.slice(0, 10), ctx.year) === h,
    ).length;
    if (openSingles) missing.push(`${pre}${openSingles} offene${openSingles === 1 ? 'r' : ''} Nachtermin${openSingles === 1 ? '' : 'e'}`);
  }
  if (period === 'jahr') {
    const kind = (typeId: string) => ctx.types.get(typeId)?.kind;
    if (course.testModel) {
      const n = course.assessments.filter((a) => kind(a.typeId) === 'angesagter_test').length;
      if (n < 5) missing.push(`${n} von mindestens 5 angesagten Tests`);
    } else if (course.plannedSchulaufgaben > 0) {
      const n = course.assessments.filter((a) => kind(a.typeId) === 'schulaufgabe' || kind(a.typeId) === 'ersatz_schulaufgabe').length;
      if (n < course.plannedSchulaufgaben) missing.push(`${n} von ${course.plannedSchulaufgaben} Schulaufgaben`);
    }
  }
  return { complete: missing.length === 0, missing };
}

export function isoWeek(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-KW${String(week).padStart(2, '0')}`;
}

function names(list: Student[], max = 4): string {
  const n = list.map((s) => `${s.firstName} ${s.lastName}`.trim());
  return n.length > max ? `${n.slice(0, max).join(', ')} und ${n.length - max} weitere` : n.join(', ');
}

/** Prüft einen Kurs auf die Vorgaben der RSO. `today` im Format YYYY-MM-DD. */
export function courseWarnings(cls: SchoolClass, course: Course, core: Core, year: SchoolYear, today: string): Warning[] {
  const out: Warning[] = [];
  const types = new Map(core.types.map((t) => [t.id, t]));
  const ctx: Ctx = { types, year };
  const subject = core.subjects.find((s) => s.id === course.subjectId)?.name ?? 'Fach';
  const label = `${cls.name} · ${subject}`;
  const students = activeStudents(cls, course);
  const push = (w: Omit<Warning, 'classId' | 'courseId'>) => out.push({ ...w, classId: cls.id, courseId: course.id });

  // Mindestanzahl kleiner Leistungsnachweise je Halbjahr (RSO § 19 Abs. 6 Satz 3, § 18 Abs. 3 Satz 2).
  const halves: Array<{ half: 1 | 2; start: string; end: string }> = [
    { half: 1, start: year.start, end: year.halfSwitch },
    { half: 2, start: year.halfSwitch, end: year.end },
  ];
  const needOral = needsOral(course);
  const minSmall = minSmallPerHalf(course);
  for (const h of halves) {
    if (today < h.start) continue;
    const ended = today >= h.end;
    const left = days(today, h.end);
    if (!ended && left > 42) continue; // erst in den letzten sechs Wochen des Halbjahres melden
    const missingSmall: Student[] = [];
    const missingOral: Student[] = [];
    for (const s of students) {
      const e = entriesFor(course, s.id, ctx, h.half);
      const small = e.filter((x) => x.category === 'klein');
      if (!course.testModel && small.length < minSmall) missingSmall.push(s);
      if (needOral && !small.some((x) => x.mode === 'muendlich')) missingOral.push(s);
    }
    const sev: Severity = ended ? 'warn' : 'info';
    if (missingSmall.length) {
      push({
        id: `${course.id}-klein-${h.half}`,
        severity: sev,
        title: `${label}: weniger als ${minSmall} kleine Leistungsnachweise im ${h.half}. Halbjahr`,
        detail: `Betrifft ${missingSmall.length} von ${students.length}: ${names(missingSmall)}.`,
        rule: 'RSO § 19 Abs. 6 Satz 3',
      });
    }
    if (missingOral.length) {
      push({
        id: `${course.id}-muendlich-${h.half}`,
        severity: sev,
        title: `${label}: mündlicher Leistungsnachweis fehlt im ${h.half}. Halbjahr`,
        detail: `Betrifft ${missingOral.length} von ${students.length}: ${names(missingOral)}.`,
        rule: course.testModel ? 'RSO § 18 Abs. 3 Satz 2' : 'RSO § 19 Abs. 6 Satz 3',
      });
    }
  }

  // Anzahl der Schulaufgaben bzw. angesagten Tests (RSO § 18 Abs. 1 und 3).
  const kindsOf = (a: { typeId: string }) => types.get(a.typeId)?.kind;
  const nearEnd = today >= year.end || days(today, year.end) <= 56;
  if (course.testModel) {
    const n = course.assessments.filter((a) => kindsOf(a) === 'angesagter_test').length;
    if (n < 5 && nearEnd) {
      push({
        id: `${course.id}-tests`,
        severity: today >= year.end ? 'warn' : 'info',
        title: `${label}: ${n} von mindestens 5 angesagten Tests`,
        detail: 'Bei Ersatz der Schulaufgaben sind mindestens fünf angesagte Tests zu halten.',
        rule: 'RSO § 18 Abs. 3 Satz 1',
      });
    }
  } else if (course.plannedSchulaufgaben > 0) {
    const n = course.assessments.filter((a) => {
      const k = kindsOf(a);
      return k === 'schulaufgabe' || k === 'ersatz_schulaufgabe';
    }).length;
    if (n > course.plannedSchulaufgaben) {
      push({
        id: `${course.id}-sa-zuviel`,
        severity: 'warn',
        title: `${label}: ${n} Schulaufgaben angelegt, vorgesehen sind ${course.plannedSchulaufgaben}`,
        detail: 'Die Anzahl der Schulaufgaben ist je Fach und Jahrgangsstufe festgelegt.',
        rule: 'RSO § 18 Abs. 1',
      });
    } else if (n < course.plannedSchulaufgaben && nearEnd) {
      push({
        id: `${course.id}-sa-fehlt`,
        severity: today >= year.end ? 'warn' : 'info',
        title: `${label}: ${n} von ${course.plannedSchulaufgaben} Schulaufgaben`,
        detail: 'Das Schuljahr endet bald; es fehlen noch Schulaufgaben.',
        rule: 'RSO § 18 Abs. 1',
      });
    }
  }

  // Doppeltes Gewicht großer Leistungsnachweise (RSO § 23 Abs. 2 Satz 3).
  for (const a of course.assessments) {
    const t = types.get(a.typeId);
    if (t?.category === 'gross' && (a.weight ?? t.weight) !== 2) {
      push({
        id: `${a.id}-gewicht`,
        severity: 'info',
        title: `${label}: „${a.title || t.name}“ zählt nicht doppelt`,
        detail: `Gewicht ${a.weight ?? t.weight}. Schulaufgaben und angesagte Tests haben laut RSO doppeltes Gewicht.`,
        rule: 'RSO § 23 Abs. 2 Satz 3',
      });
    }
  }

  // Offene Nachtermine (RSO § 22).
  const open = course.grades.filter((g) => g.status === 'nachtermin');
  if (open.length) {
    const ids = new Set(open.map((g) => g.studentId));
    push({
      id: `${course.id}-nachtermin`,
      severity: 'warn',
      title: `${label}: ${open.length} offene${open.length === 1 ? 'r' : ''} Nachtermin${open.length === 1 ? '' : 'e'}`,
      detail: names(cls.students.filter((s) => ids.has(s.id))),
      rule: 'RSO § 22',
    });
  }

  // Fehlende Zeugnisnoten kurz vor den Zeugnisterminen.
  const terms: Array<{ term: 'zwischen' | 'jahr'; due: string; name: string }> = [
    { term: 'zwischen', due: year.halfSwitch, name: 'Zwischenzeugnis' },
    { term: 'jahr', due: year.end, name: 'Jahreszeugnis' },
  ];
  for (const t of terms) {
    const d = days(today, t.due);
    if (d > 21) continue;
    if (t.term === 'zwischen' && today >= year.end) continue;
    const have = new Set(course.reportGrades.filter((r) => r.term === t.term).map((r) => r.studentId));
    const missing = students.filter((s) => !have.has(s.id));
    if (missing.length) {
      push({
        id: `${course.id}-zeugnis-${t.term}`,
        severity: d < 0 ? 'warn' : 'info',
        title: `${label}: ${missing.length} Note${missing.length === 1 ? '' : 'n'} fürs ${t.name} fehlen`,
        detail: names(missing),
        rule: 'Zeugnisnote',
      });
    }
  }

  return out;
}

/** Terminregeln der Klasse über alle eigenen Kurse (RSO § 17 Abs. 3). */
export function classWarnings(cls: SchoolClass, core: Core): Warning[] {
  const out: Warning[] = [];
  const types = new Map(core.types.map((t) => [t.id, t]));
  type Item = { date: string; type: AssessmentType; course: Course };
  const items: Item[] = [];
  for (const c of cls.courses) {
    for (const a of c.assessments) {
      const t = types.get(a.typeId);
      if (t) items.push({ date: a.date, type: t, course: c });
    }
  }
  const subj = (c: Course) => core.subjects.find((s) => s.id === c.subjectId)?.short ?? '?';
  const byDay = new Map<string, Item[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  for (const [date, list] of byDay) {
    const limited = list.filter((i) => i.type.countsForDayLimit);
    const fmt = new Date(`${date}T12:00:00`).toLocaleDateString('de-DE');
    if (limited.length > 1) {
      out.push({
        id: `${cls.id}-tag-${date}`,
        severity: 'warn',
        classId: cls.id,
        courseId: null,
        title: `${cls.name}: ${limited.length} angekündigte Leistungsnachweise am ${fmt}`,
        detail: limited.map((i) => `${i.type.short} ${subj(i.course)}`).join(', '),
        rule: 'RSO § 17 Abs. 3 Satz 2',
      });
    }
    if (limited.length && list.some((i) => i.type.kind === 'stegreifaufgabe')) {
      out.push({
        id: `${cls.id}-ex-${date}`,
        severity: 'warn',
        classId: cls.id,
        courseId: null,
        title: `${cls.name}: Stegreifaufgabe am Tag eines angekündigten Leistungsnachweises (${fmt})`,
        detail: list.map((i) => `${i.type.short} ${subj(i.course)}`).join(', '),
        rule: 'RSO § 17 Abs. 3 Satz 3',
      });
    }
  }
  const byWeek = new Map<string, Item[]>();
  for (const it of items) {
    if (!it.type.countsForDayLimit) continue;
    const w = isoWeek(it.date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), it]);
  }
  for (const [week, list] of byWeek) {
    const sa = list.filter((i) => i.type.kind === 'schulaufgabe').length;
    if (list.length > 3 || sa > 2) {
      out.push({
        id: `${cls.id}-woche-${week}`,
        severity: 'info',
        classId: cls.id,
        courseId: null,
        title: `${cls.name}: ${list.length} angekündigte Leistungsnachweise in ${week.replace('-', ' ')}${sa > 2 ? `, davon ${sa} Schulaufgaben` : ''}`,
        detail: 'Pro Kalenderwoche sollen höchstens drei, davon höchstens zwei Schulaufgaben gehalten werden.',
        rule: 'RSO § 17 Abs. 3 Satz 2',
      });
    }
  }
  return out;
}

export function allWarnings(classes: SchoolClass[], core: Core, today: string): Warning[] {
  const out: Warning[] = [];
  for (const cls of classes) {
    const year = core.years.find((y) => y.id === cls.yearId);
    if (!year) continue;
    out.push(...classWarnings(cls, core));
    for (const c of cls.courses) out.push(...courseWarnings(cls, c, core, year, today));
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1));
}

