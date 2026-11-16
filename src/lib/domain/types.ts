/** Datenmodell der Notenverwaltung. Alle Datumswerte als ISO-Zeichenketten. */

export type ID = string;
export type GradeValue = 1 | 2 | 3 | 4 | 5 | 6;
export type Half = 1 | 2;
export type Period = Half | 'jahr';

export interface SchoolYear {
  id: ID;
  name: string; // z. B. „2026/27“
  start: string; // YYYY-MM-DD
  halfSwitch: string; // erster Tag des 2. Halbjahres
  end: string; // letzter Unterrichtstag
}

export interface Subject {
  id: ID;
  name: string;
  short: string;
  color: string; // Schlüssel aus SUBJECT_COLORS
}

/** Feste Kennungen der Leistungsnachweisarten nach RSO §§ 17–19. */
export type AssessmentKind =
  | 'schulaufgabe'
  | 'angesagter_test'
  | 'ersatz_schulaufgabe'
  | 'kurzarbeit'
  | 'stegreifaufgabe'
  | 'leistungstest'
  | 'rechenschaftsablage'
  | 'referat'
  | 'unterrichtsbeitrag'
  | 'praktisch'
  | 'gleichwertig'
  | 'eigene';

export type Category = 'gross' | 'klein';
export type Mode = 'schriftlich' | 'muendlich' | 'praktisch';

export interface AssessmentType {
  id: ID;
  kind: AssessmentKind;
  name: string;
  short: string;
  category: Category;
  mode: Mode;
  weight: number;
  /** Muss mindestens eine Woche vorher angekündigt werden (RSO § 18 Abs. 7, § 19 Abs. 1, 3). */
  announced: boolean;
  /** Zählt für die Tageshöchstgrenze nach RSO § 17 Abs. 3. */
  countsForDayLimit: boolean;
  builtin: boolean;
  archived?: boolean;
}

/** Notenschlüssel: Mindestprozent für die Noten 1 bis 5; darunter Note 6. */
export interface GradeKey {
  id: ID;
  name: string;
  thresholds: [number, number, number, number, number];
  /** Schrittweite der Punktgrenzen (0,5 oder 1). */
  step: 0.5 | 1;
}

export type Rounding = 'streng' | 'mild';
export type Theme = 'system' | 'hell' | 'dunkel';

export interface Settings {
  autoLockMinutes: number;
  rounding: Rounding;
  theme: Theme;
  activeYearId: ID | null;
  defaultGradeKeyId: ID;
}

/** Stammdaten und Einstellungen: ein eigener verschlüsselter Block. */
export interface Core {
  v: 1;
  settings: Settings;
  years: SchoolYear[];
  subjects: Subject[];
  types: AssessmentType[];
  gradeKeys: GradeKey[];
}

export type WpfGroup = 'I' | 'II' | 'IIIa' | 'IIIb' | '';

export interface Student {
  id: ID;
  lastName: string;
  firstName: string;
  /** Vermerk zu Nachteilsausgleich oder Notenschutz (Art. 52 Abs. 5 BayEUG). */
  support?: string;
  leftAt?: string; // Austrittsdatum
}

/** Status einer Einzelnote. */
export type GradeStatus =
  | 'gewertet'
  | 'nachtermin' // entschuldigt versäumt, Nachtermin offen (RSO § 22)
  | 'versaeumt' // unentschuldigt versäumt → Note 6 (RSO § 21 Abs. 4)
  | 'verweigert' // Leistung verweigert → Note 6 (RSO § 21 Abs. 4)
  | 'unterschleif' // Unterschleif → Note 6 möglich (RSO § 21 Abs. 2)
  | 'nicht_gewertet';

export interface GradeChange {
  at: string; // ISO-Zeitpunkt der Änderung
  value: GradeValue | null;
  points: number | null;
  status: GradeStatus;
  comment: string;
}

export interface Grade {
  id: ID;
  studentId: ID;
  /** Zugehöriger Leistungsnachweis; leer bei Einzelnoten (z. B. Unterrichtsbeitrag). */
  assessmentId: ID | null;
  /** Nur bei Einzelnoten: Art und Gewicht. */
  typeId: ID | null;
  weight: number | null;
  title: string;
  value: GradeValue | null;
  points: number | null;
  status: GradeStatus;
  comment: string;
  /** Zeitpunkt der Leistung (änderbar, vorbelegt mit „jetzt“). */
  performedAt: string;
  /** Zeitpunkt der ersten Erfassung (automatisch, unveränderlich). */
  recordedAt: string;
  history: GradeChange[];
}

export interface Assessment {
  id: ID;
  typeId: ID;
  title: string;
  date: string; // YYYY-MM-DD
  /** Überschreibt das Gewicht der Art. */
  weight: number | null;
  maxPoints: number | null;
  gradeKeyId: ID | null;
  createdAt: string;
}

export type ReportTerm = 'zwischen' | 'jahr';

export interface ReportGrade {
  studentId: ID;
  term: ReportTerm;
  value: GradeValue;
  setAt: string;
}

export interface Course {
  id: ID;
  subjectId: ID;
  weeklyHours: number;
  /** Vorrückungsfach (RSO § 19 Abs. 6 Satz 3). */
  promotionSubject: boolean;
  /** Soll-Anzahl Schulaufgaben (RSO § 18 Abs. 1). */
  plannedSchulaufgaben: number;
  /** Schulaufgaben und Stegreifaufgaben durch angesagte Tests ersetzt (RSO § 18 Abs. 3). */
  testModel: boolean;
  /** Schülerinnen und Schüler der Klasse, die diesen Kurs nicht besuchen. */
  excludedStudentIds: ID[];
  assessments: Assessment[];
  grades: Grade[];
  reportGrades: ReportGrade[];
}

/** Art einer pädagogischen Notiz (zum Filtern für Elterngespräche und Konferenzen). */
export type NoteTopic = 'beobachtung' | 'lob' | 'verhalten' | 'eltern' | 'massnahme';

/** Pädagogische Notiz zu einer Schülerin oder einem Schüler. */
export interface StudentNote {
  id: ID;
  studentId: ID;
  /** Zeitpunkt des Ereignisses (änderbar, vorbelegt mit „jetzt“). */
  at: string;
  topic: NoteTopic;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** Art eines Logbuch-Eintrags. */
export type LogKind = 'grade' | 'grade_removed' | 'assessment_added' | 'assessment_removed' | 'note_added' | 'report_grade';

/**
 * Logbuch-Eintrag („Letzte Aktionen“ auf der Startseite). Enthält nur Verweise,
 * keine Namen: Namen werden erst beim Anzeigen aufgelöst, und mit einer
 * Schülerin oder einem Schüler verschwinden auch deren Einträge.
 */
export interface LogEntry {
  id: ID;
  at: string; // ISO-Zeitpunkt der Aktion
  kind: LogKind;
  courseId?: ID;
  studentId?: ID;
  assessmentId?: ID;
  /** Art bei Einzelnoten oder angelegten Leistungsnachweisen. */
  typeId?: ID;
  value?: GradeValue | null;
  /** Nur bei Änderungen: vorheriger Wert. */
  prev?: GradeValue | null;
  changed?: boolean;
  status?: GradeStatus;
  /** Titel des Leistungsnachweises (für gelöschte Nachweise). */
  title?: string;
  topic?: NoteTopic;
  term?: ReportTerm;
}

/** Eine Klasse mit allen Kursen und Noten: ein eigener verschlüsselter Block. */
export interface SchoolClass {
  v: 1;
  id: ID;
  yearId: ID;
  name: string;
  gradeLevel: number; // Jahrgangsstufe 5–10
  wpf: WpfGroup;
  students: Student[];
  courses: Course[];
  /** Pädagogische Notizen; fehlt in älteren Datenständen. */
  notes?: StudentNote[];
  /** Logbuch der letzten Aktionen; fehlt in älteren Datenständen. */
  log?: LogEntry[];
  createdAt: string;
}

export interface Data {
  core: Core;
  classes: SchoolClass[];
}
