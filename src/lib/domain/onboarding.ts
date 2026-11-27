import { randomId } from '../crypto/encoding';
import { addDays, holidayAt, weekday } from './calendar';
import { plannedSchulaufgabenFor, SUBJECT_SUGGESTIONS, weeklyHoursFor } from './defaults';
import { isSportName, measurePart, notePart, sportOutcome } from './sport';
import { disciplineById } from './sportTables';
import type {
  Assessment,
  Course,
  Grade,
  GradeValue,
  OnboardingStep,
  SchoolClass,
  SchoolYear,
  Settings,
  SportGroup,
  SportResult,
  SportSpec,
  Student,
  WpfGroup,
} from './types';

/** Einrichtungsassistent: reine Logik ohne Oberfläche. */

export interface StepInfo {
  id: OnboardingStep;
  title: string;
  hint: string;
}

export const STEPS: StepInfo[] = [
  { id: 'faecher', title: 'Deine Fächer', hint: 'Wofür du die Lehrbefähigung hast' },
  { id: 'schuljahr', title: 'Schuljahr & Termine', hint: 'Zeugnisse, Notenschluss, Ferien' },
  { id: 'klassen', title: 'Klassen & Schüler', hint: 'Klassen anlegen, Namen übernehmen' },
  { id: 'unterricht', title: 'Dein Unterricht', hint: 'Welches Fach in welcher Klasse' },
  { id: 'sicherung', title: 'Sicherung', hint: 'Schutz vor Datenverlust' },
  { id: 'fertig', title: 'Fertig', hint: 'Los geht’s' },
];

export const stepIndex = (id: OnboardingStep) => STEPS.findIndex((s) => s.id === id);

/** Ob der Assistent offen ist. Fehlt der Zustand (Datenstand von vor dem Assistenten), gilt er als erledigt. */
export function needsOnboarding(settings: Pick<Settings, 'onboarding'> | undefined): boolean {
  return !!settings?.onboarding && !settings.onboarding.doneAt;
}

// ---------- Fächer ----------

/** Vorschläge für den Fächer-Schritt (Realschule Bayern), ergänzt um Religionslehre und Wahlpflichtfächer. */
export const ONBOARDING_SUBJECTS: Array<{ name: string; short: string }> = [
  ...SUBJECT_SUGGESTIONS,
  { name: 'Katholische Religionslehre', short: 'K' },
  { name: 'Evangelische Religionslehre', short: 'Ev' },
  { name: 'Ethik', short: 'Eth' },
  { name: 'Werken', short: 'Wk' },
  { name: 'Ernährung und Gesundheit', short: 'EG' },
  { name: 'Sozialwesen', short: 'Sw' },
];

/** Kürzel für ein eigenes Fach: bekannter Vorschlag, sonst Initialen bzw. die ersten Buchstaben. */
export function suggestShort(name: string): string {
  const n = name.trim();
  if (!n) return '';
  const known = ONBOARDING_SUBJECTS.find((s) => s.name.toLowerCase() === n.toLowerCase());
  if (known) return known.short;
  const words = n.split(/[\s/-]+/).filter((w) => /^\p{Lu}/u.test(w));
  if (words.length > 1) return words.map((w) => w[0]).join('').slice(0, 4);
  return n.slice(0, 3).replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}

// ---------- Klassen ----------

export interface ParsedClass {
  name: string;
  /** Aus dem Namen erkannte Jahrgangsstufe (5–10), sonst null. */
  gradeLevel: number | null;
}

/** Jahrgangsstufe aus einem Klassennamen wie „8b“, „10 c“ oder „7M1“. */
export function gradeLevelOf(name: string): number | null {
  const m = /^\s*(\d{1,2})(?!\d)/.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 5 && n <= 10 ? n : null;
}

/** Zerlegt eine Eingabe wie „7a, 8b 9c“ in einzelne Klassen; doppelte fallen weg. */
export function parseClassNames(input: string): ParsedClass[] {
  const seen = new Set<string>();
  const out: ParsedClass[] = [];
  for (const raw of input.split(/[,;\n]+|\s+(?=\d)/)) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, gradeLevel: gradeLevelOf(name) });
  }
  return out;
}

/** Ab Jahrgangsstufe 7 gibt es Wahlpflichtfächergruppen. */
export const needsWpf = (gradeLevel: number) => gradeLevel >= 7;

// ---------- Unterricht ----------

export interface CourseDefaults {
  weeklyHours: number;
  plannedSchulaufgaben: number;
  /** Vorrückungsfach; Sport nicht (RSO § 25 Abs. 1). */
  promotionSubject: boolean;
  /** Ob die Werte aus Stundentafel bzw. RSO § 18 stammen (sonst Platzhalter). */
  hoursFromRso: boolean;
  saFromRso: boolean;
}

export function courseDefaults(subjectName: string, gradeLevel: number, wpf: WpfGroup): CourseDefaults {
  const h = weeklyHoursFor(subjectName, gradeLevel, wpf);
  const sa = plannedSchulaufgabenFor(subjectName, gradeLevel, wpf);
  return { weeklyHours: h ?? 2, plannedSchulaufgaben: sa ?? 0, promotionSubject: !isSportName(subjectName), hoursFromRso: h !== null, saFromRso: sa !== null };
}

/** Ein Kurs lässt sich im Assistenten nur abwählen, solange nichts eingetragen ist. */
export const courseRemovable = (c: Course) => !c.assessments.length && !c.grades.length && !(c.observations?.length ?? 0);

// ---------- Erste Schritte ----------

export interface ChecklistItem {
  id: 'klasse' | 'schueler' | 'unterricht' | 'termin' | 'note' | 'sicherung';
  label: string;
  done: boolean;
}

/** Fortschritt für die Karte „Erste Schritte“; die Beispielklasse zählt nicht mit. */
export function gettingStarted(classes: SchoolClass[], hasBackup: boolean): ChecklistItem[] {
  const real = classes.filter((c) => !c.demo);
  const courses = real.flatMap((c) => c.courses);
  return [
    { id: 'klasse', label: 'Erste Klasse anlegen', done: real.length > 0 },
    { id: 'schueler', label: 'Schülerliste übernehmen', done: real.some((c) => c.students.length > 0) },
    { id: 'unterricht', label: 'Unterricht zuordnen', done: courses.length > 0 },
    { id: 'termin', label: 'Ersten Leistungsnachweis planen', done: courses.some((c) => c.assessments.length > 0) },
    { id: 'note', label: 'Erste Note eintragen', done: courses.some((c) => c.grades.length > 0) },
    { id: 'sicherung', label: 'Sicherung einrichten', done: hasBackup },
  ];
}

// ---------- Beispielklasse ----------

const DEMO_NAMES: Array<[string, string]> = [
  ['Bauer', 'Lena'],
  ['Demir', 'Elif'],
  ['Fischer', 'Jonas'],
  ['Hofmann', 'Mia'],
  ['Kovač', 'Luka'],
  ['Maier', 'Sophie'],
  ['Nguyen', 'Minh'],
  ['Öztürk', 'Can'],
  ['Schmid', 'Paul'],
  ['Wagner', 'Emilia'],
  ['Weber', 'Noah'],
  ['Zimmermann', 'Hanna'],
];

/** Gleichbleibende „Zufallsnoten“: überwiegend 2–3, einzelne 1 und 4, selten 5. */
const DEMO_GRADES: GradeValue[] = [2, 3, 1, 3, 2, 4, 2, 3, 2, 5, 3, 2, 1, 3, 4, 2, 3, 2];

/** Nächster Unterrichtstag (kein Wochenende, keine Ferien), vor- oder rückwärts gesucht. */
function schoolDay(year: SchoolYear, iso: string, dir: 1 | -1): string {
  let d = iso;
  for (let i = 0; i < 40 && (weekday(d) === 0 || weekday(d) === 6 || holidayAt(year, d)); i++) d = addDays(d, dir);
  return d;
}

/**
 * Beispielklasse mit erfundenen Namen, einem Unterricht im gewählten Fach,
 * zwei bereits benoteten Leistungsnachweisen, mündlichen Noten und einem
 * anstehenden Termin. Schreibt kein Logbuch – so bleibt erkennbar, ob schon
 * jemand darin gearbeitet hat.
 */
export function demoClass(year: SchoolYear, subject: { id: string; name: string; sport?: SportGroup }, today: string, now = new Date().toISOString()): SchoolClass {
  const students: Student[] = DEMO_NAMES.map(([lastName, firstName]) => ({ id: randomId(), lastName, firstName }));
  const def = courseDefaults(subject.name, 8, 'II');
  if (isSportName(subject.name)) return demoSportClass(year, subject, students, def, today, now);
  const a = (typeId: string, title: string, date: string): Assessment => ({ id: randomId(), typeId, title, date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: now });
  const sa = a('typ-schulaufgabe', '1. Schulaufgabe', schoolDay(year, addDays(today, -21), -1));
  const ex = a('typ-stegreifaufgabe', '1. Stegreifaufgabe', schoolDay(year, addDays(today, -9), -1));
  const ka = a('typ-kurzarbeit', '1. Kurzarbeit', schoolDay(year, addDays(today, 12), 1));
  const grade = (studentId: string, value: GradeValue, at: string, extra: Partial<Grade> = {}): Grade => ({
    id: randomId(),
    studentId,
    assessmentId: null,
    typeId: null,
    weight: null,
    title: '',
    value,
    points: null,
    status: 'gewertet',
    comment: '',
    performedAt: `${at}T09:00:00.000Z`,
    recordedAt: now,
    history: [],
    ...extra,
  });
  const grades: Grade[] = [];
  students.forEach((s, i) => {
    grades.push(grade(s.id, DEMO_GRADES[i % DEMO_GRADES.length], sa.date, { assessmentId: sa.id }));
    grades.push(grade(s.id, DEMO_GRADES[(i + 5) % DEMO_GRADES.length], ex.date, { assessmentId: ex.id }));
    if (i % 2 === 0) {
      const at = schoolDay(year, addDays(today, -4 - (i % 3)), -1);
      grades.push(grade(s.id, DEMO_GRADES[(i + 9) % DEMO_GRADES.length], at, { typeId: 'typ-rechenschaftsablage', title: 'Rechenschaftsablage' }));
    }
  });
  const course: Course = {
    id: randomId(),
    subjectId: subject.id,
    weeklyHours: def.weeklyHours,
    promotionSubject: true,
    plannedSchulaufgaben: def.plannedSchulaufgaben || 2,
    testModel: false,
    excludedStudentIds: [],
    assessments: [sa, ex, ka],
    grades,
    reportGrades: [],
  };
  return { v: 1, id: randomId(), yearId: year.id, name: '8x', gradeLevel: 8, wpf: 'II', students, courses: [course], demo: true, createdAt: now };
}

/**
 * Beispielklasse im Fach Sport: 75-m-Lauf mit zwei Versuchen (Note aus der ISB-Tabelle),
 * Basketball nach Technik und Spielfähigkeit und ein anstehender Hochsprung.
 */
function demoSportClass(
  year: SchoolYear,
  subject: { id: string; sport?: SportGroup },
  students: Student[],
  def: CourseDefaults,
  today: string,
  now: string,
): SchoolClass {
  const group: SportGroup = subject.sport ?? 'm';
  const lauf = measurePart(disciplineById('sprint75') ?? null, 8, group);
  const technik = notePart('Technik');
  const spiel = notePart('Taktik / Spielfähigkeit');
  const hoch = measurePart(disciplineById('hoch') ?? null, 8, group);
  const a = (title: string, date: string, sport: SportSpec): Assessment => ({
    id: randomId(), typeId: 'typ-sport_praktisch', title, date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: now, sport,
  });
  const a1 = a('75-m-Lauf', schoolDay(year, addDays(today, -20), -1), { field: 'leichtathletik', parts: [lauf] });
  const a2 = a('Basketball', schoolDay(year, addDays(today, -6), -1), { field: 'spiele', parts: [technik, spiel] });
  const a3 = a('Hochsprung', schoolDay(year, addDays(today, 9), 1), { field: 'leichtathletik', parts: [hoch] });
  const grades: Grade[] = [];
  const grade = (studentId: string, assessmentId: string, at: string, sport: SportResult): Grade => {
    const spec = assessmentId === a1.id ? a1.sport! : a2.sport!;
    return {
      id: randomId(), studentId, assessmentId, typeId: null, weight: null, title: '',
      value: sportOutcome(spec, sport, 'mild').value, points: null, status: 'gewertet', comment: '',
      performedAt: `${at}T09:00:00.000Z`, recordedAt: now, history: [], sport,
    };
  };
  students.forEach((s, i) => {
    const g = DEMO_GRADES[i % DEMO_GRADES.length];
    const best = g <= 5 ? lauf.thresholds[g - 1] - 0.1 * ((i % 3) + 1) : lauf.thresholds[4] + 0.6;
    const t = Math.round(best * 10) / 10;
    if (i === 4) {
      // Befreit mit Attest: keine Note.
      grades.push({ ...grade(s.id, a1.id, a1.date, { parts: {} }), value: null, status: 'befreit', comment: 'Attest', sport: undefined });
    } else {
      grades.push(grade(s.id, a1.id, a1.date, { parts: { [lauf.id]: { attempts: [Math.round((t + 0.3) * 10) / 10, t] } } }));
    }
    grades.push(
      grade(s.id, a2.id, a2.date, {
        parts: { [technik.id]: { value: DEMO_GRADES[(i + 5) % DEMO_GRADES.length] }, [spiel.id]: { value: DEMO_GRADES[(i + 7) % DEMO_GRADES.length] } },
      }),
    );
  });
  const course: Course = {
    id: randomId(),
    subjectId: subject.id,
    weeklyHours: def.weeklyHours,
    promotionSubject: false,
    plannedSchulaufgaben: 0,
    testModel: false,
    excludedStudentIds: [],
    assessments: [a1, a2, a3],
    grades,
    reportGrades: [],
  };
  return { v: 1, id: randomId(), yearId: year.id, name: '8x', gradeLevel: 8, wpf: 'II', students, courses: [course], demo: true, createdAt: now };
}

/** Beispielklasse lässt sich ohne Rückfrage entfernen, solange niemand darin gearbeitet hat. */
export const demoUntouched = (c: SchoolClass) => !!c.demo && !(c.log?.length ?? 0) && !(c.notes?.length ?? 0);
