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
  end: string; // letzter Unterrichtstag (Jahreszeugnis)
  /** Ausgabetag des Zwischenzeugnisses; fehlt in älteren Datenständen (dann gilt `halfSwitch`). */
  reportDays?: { zwischen?: string };
  /** Notenschluss je Zeugnis; legt die Schule fest. */
  reportDeadlines?: { zwischen?: string; jahr?: string };
  /** Ferien und unterrichtsfreie Tage innerhalb des Schuljahres. */
  holidays?: Holiday[];
  /** Schriftliche Abschlussprüfung (Jgst. 10) mit vorgezogenem Notenschluss. */
  finalExam?: { start: string; end: string; deadline?: string };
}

export interface Holiday {
  name: string;
  start: string; // erster Ferientag
  end: string; // letzter Ferientag
}

export interface Subject {
  id: ID;
  name: string;
  short: string;
  color: string; // Schlüssel aus SUBJECT_COLORS
  /** Nur Sport: Wertungstabelle Jungen (m) oder Mädchen (w); fehlt = ohne Tabellenvorgabe. */
  sport?: SportGroup;
}

/** Wertungstabelle im Sport (ISB-Orientierungstabellen getrennt nach Mädchen und Jungen). */
export type SportGroup = 'm' | 'w';

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
  | 'sport_praktisch'
  | 'sport_einsatz'
  | 'sport_theorie'
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
  /** Nur in Sportkursen angeboten; fehlt = in allen anderen Fächern. */
  scope?: 'sport';
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
  /** Einrichtungsassistent; fehlt bei Datenständen von vor dem Assistenten (gilt als erledigt). */
  onboarding?: OnboardingState;
}

export type OnboardingStep = 'faecher' | 'schuljahr' | 'klassen' | 'unterricht' | 'sicherung' | 'fertig';

export interface OnboardingState {
  step: OnboardingStep;
  /** Assistent abgeschlossen oder auf später verschoben. */
  doneAt?: string;
  /** Karte „Erste Schritte“ auf der Startseite ausgeblendet. */
  checklistDismissedAt?: string;
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
  | 'nicht_gewertet'
  | 'befreit'; // Sport: vom Unterricht befreit (Attest) – keine Note, ggf. Zeugnisbemerkung (RSO § 31 Abs. 6)

export interface GradeChange {
  at: string; // ISO-Zeitpunkt der Änderung
  value: GradeValue | null;
  points: number | null;
  status: GradeStatus;
  comment: string;
  /** Vorherige Angaben zur Leistung; nur gesetzt, wenn sie sich mit dieser Änderung geändert haben. */
  performedAt?: string;
  title?: string;
  typeId?: ID | null;
  weight?: number | null;
  /** Nur bei Wiederherstellung: Zeitpunkt, zu dem die Note gelöscht worden war. */
  restoredFrom?: string;
}

/** Gelöschte Note im Papierkorb der Klasse – bleibt mit Verlauf nachvollziehbar. */
export interface DeletedGrade {
  grade: Grade;
  courseId: ID;
  deletedAt: string;
  /** Titel des Leistungsnachweises zum Zeitpunkt der Löschung. */
  assessmentTitle?: string;
  /** Gelöscht zusammen mit dem ganzen Leistungsnachweis. */
  withAssessment?: boolean;
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
  /** Nur bei Einzelnoten: ersetzt einen versäumten Leistungsnachweis (z. B. Rechenschaftsablage statt Ex). */
  replacesAssessmentId?: ID;
  /** Nur bei Einzelnoten: Note entstand aus dieser Unterrichtsbeobachtung. */
  observationId?: ID;
  /** Zeitpunkt der ersten Erfassung (automatisch, unveränderlich). */
  recordedAt: string;
  history: GradeChange[];
  /** Nur bei Sport-Nachweisen: Messwerte und Teilnoten, aus denen `value` berechnet wird. */
  sport?: SportResult;
}

// ---------- Sport ----------

/** Handlungsfelder und Lernbereiche nach LehrplanPLUS Sport (Realschule). */
export type SportField = 'leichtathletik' | 'schwimmen' | 'spiele' | 'turnen' | 'gymnastik' | 'fitness' | 'sonstiges';

/** Einheit eines Messwerts: Sekunden, Meter oder Anzahl (Wiederholungen, Punkte). */
export type SportUnit = 's' | 'm' | 'n';

/** Fünf Grenzwerte für die Noten 1 bis 5; schlechter als der fünfte ergibt Note 6. */
export type SportThresholds = [number, number, number, number, number];

interface SportPartBase {
  id: ID;
  label: string;
  /** Anteil an der Note des Nachweises (relativ zu den übrigen Teilen). */
  weight: number;
}

/** Teilnote, die direkt vergeben wird (z. B. Technik, Spielfähigkeit). */
export interface SportPartNote extends SportPartBase {
  kind: 'note';
}

/** Messwert mit Wertungstabelle (z. B. 50-m-Lauf, Weitsprung). */
export interface SportPartMeasure extends SportPartBase {
  kind: 'messung' | 'fortschritt';
  /** Kennung der Disziplin aus den ISB-Tabellen, leer bei eigener Messung. */
  discipline?: string;
  unit: SportUnit;
  /** Kleinere Werte sind besser (Zeiten) oder größere (Weiten, Höhen, Anzahl). */
  better: 'low' | 'high';
  thresholds: SportThresholds;
  /** Anzahl der Versuche; gewertet wird der beste. */
  attempts: number;
}

export type SportPart = SportPartNote | SportPartMeasure;

/** Bewertungsaufbau eines Sport-Nachweises. */
export interface SportSpec {
  field: SportField;
  parts: SportPart[];
}

/** Erfasste Werte je Teil. Bei `fortschritt`: `entry` = Eingangstest, `attempts` = Ausgangstest. */
export interface SportPartResult {
  value?: GradeValue;
  attempts?: Array<number | null>;
  entry?: Array<number | null>;
}

export interface SportResult {
  parts: Record<ID, SportPartResult>;
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
  /** Nur Sport: Messwerte und Teilnoten; die Note wird daraus berechnet. */
  sport?: SportSpec;
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
  /** Unterrichtsbeobachtungen; fehlt in älteren Datenständen. */
  observations?: ObservationPhase[];
}

export type Stars = 1 | 2 | 3 | 4 | 5;

/** Eine einzelne Beobachtung im Unterricht. */
export interface Observation {
  id: ID;
  at: string; // YYYY-MM-DD
  stars: Stars;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Beobachtungsphase für einen Unterrichtsbeitrag: Eindrücke mehrerer Stunden
 * über einige Wochen, abgeschlossen mit einer Note.
 */
export interface ObservationPhase {
  id: ID;
  studentId: ID;
  /** Art der Note beim Abschluss, standardmäßig Unterrichtsbeitrag. */
  typeId: ID;
  startedAt: string;
  closedAt?: string;
  /** Note, mit der die Phase abgeschlossen wurde. */
  gradeId?: ID;
  entries: Observation[];
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
  /** Papierkorb gelöschter Noten; fehlt in älteren Datenständen. */
  trash?: DeletedGrade[];
  /** Beispielklasse aus dem Einrichtungsassistenten (erfundene Namen). */
  demo?: boolean;
  createdAt: string;
}

export interface Data {
  core: Core;
  classes: SchoolClass[];
}
