import { randomId } from '../crypto/encoding';
import { plannedSchulaufgabenFor, SUBJECT_COLORS } from '../domain/defaults';
import { gradeFromPoints } from '../domain/gradeKey';
import { appendLog } from '../domain/logbook';
import type {
  Assessment,
  DeletedGrade,
  AssessmentType,
  Course,
  Grade,
  GradeKey,
  LogEntry,
  NoteTopic,
  Observation,
  ObservationPhase,
  StudentNote,
  GradeStatus,
  GradeValue,
  ReportTerm,
  SchoolClass,
  Student,
  Subject,
  WpfGroup,
} from '../domain/types';
import { app } from './app.svelte';

const now = () => new Date().toISOString();

/** Schreibt einen Eintrag ins Logbuch der Klasse (ohne zu speichern – das macht der Aufrufer). */
function log(cls: SchoolClass, entry: Omit<LogEntry, 'id' | 'at'>) {
  const e: LogEntry = { id: randomId(), at: now(), ...entry };
  for (const k of Object.keys(e) as (keyof LogEntry)[]) if (e[k] === undefined) delete e[k];
  cls.log = appendLog(cls.log ?? [], e);
}

/** Leert das Logbuch aller Klassen. */
export function clearLog() {
  for (const cls of app.classes) {
    if (!cls.log?.length) continue;
    cls.log = [];
    app.touch(cls.id);
  }
}

export const SIX_STATUSES: GradeStatus[] = ['versaeumt', 'verweigert', 'unterschleif'];

export const STATUS_LABEL: Record<GradeStatus, string> = {
  gewertet: 'Gewertet',
  nachtermin: 'Entschuldigt versäumt – Nachtermin offen',
  versaeumt: 'Unentschuldigt versäumt (Note 6)',
  verweigert: 'Leistung verweigert (Note 6)',
  unterschleif: 'Unterschleif (Note 6)',
  nicht_gewertet: 'Nicht gewertet',
};

/**
 * Ob ein versäumter Leistungsnachweis dieser Art nachgeholt wird (RSO § 22):
 * angekündigte Nachweise wie Schulaufgaben, Tests und Kurzarbeiten ja,
 * unangekündigte wie Stegreifaufgaben nein.
 */
export function allowsMakeup(type: AssessmentType | undefined): boolean {
  return !!type && type.announced && type.kind !== 'stegreifaufgabe';
}

/** Bemerkung, die bei Eingabe von „X“ (nicht teilgenommen) gesetzt wird. */
export const ABSENT_COMMENT = 'nicht teilgenommen';

export const STATUS_SHORT: Record<GradeStatus, string> = {
  gewertet: '',
  nachtermin: 'NT',
  versaeumt: 'v',
  verweigert: 'vw',
  unterschleif: 'U',
  nicht_gewertet: '–',
};

// ---------- Nachschlagen ----------

export function findClass(id: string): SchoolClass | undefined {
  return app.classes.find((c) => c.id === id);
}

export function findCourse(cls: SchoolClass | undefined, id: string): Course | undefined {
  return cls?.courses.find((c) => c.id === id);
}

export function subjectOf(course: Course): Subject | undefined {
  return app.core.subjects.find((s) => s.id === course.subjectId);
}

export function typeById(id: string | null | undefined): AssessmentType | undefined {
  return app.core.types.find((t) => t.id === id);
}

export function gradeKeyById(id: string | null | undefined): GradeKey {
  const keys = app.core.gradeKeys;
  return keys.find((k) => k.id === id) ?? keys.find((k) => k.id === app.core.settings.defaultGradeKeyId) ?? keys[0];
}

export function yearOf(cls: SchoolClass) {
  return app.core.years.find((y) => y.id === cls.yearId);
}

export function sortStudents(list: Student[]): Student[] {
  return [...list].sort(
    (a, b) => a.lastName.localeCompare(b.lastName, 'de') || a.firstName.localeCompare(b.firstName, 'de'),
  );
}

export function courseStudents(cls: SchoolClass, course: Course): Student[] {
  const ex = new Set(course.excludedStudentIds);
  return sortStudents(cls.students.filter((s) => !ex.has(s.id)));
}

export function sortedAssessments(course: Course): Assessment[] {
  return [...course.assessments].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

// ---------- Fächer ----------

export function addSubject(name: string, short: string): Subject {
  const used = new Set(app.core.subjects.map((s) => s.color));
  const color = SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[app.core.subjects.length % SUBJECT_COLORS.length];
  const s: Subject = { id: randomId(), name: name.trim(), short: short.trim() || name.trim().slice(0, 3), color };
  app.core.subjects.push(s);
  app.touch();
  // Den reaktiven Eintrag zurückgeben, nicht das Rohobjekt – sonst gehen spätere Änderungen verloren.
  return app.core.subjects[app.core.subjects.length - 1];
}

export function updateSubject(id: string, patch: Partial<Omit<Subject, 'id'>>) {
  const s = app.core.subjects.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, patch);
  app.touch();
}

export function subjectInUse(id: string): boolean {
  return app.classes.some((c) => c.courses.some((k) => k.subjectId === id));
}

export function removeSubject(id: string) {
  if (subjectInUse(id)) throw new Error('Das Fach wird noch in einem Unterricht verwendet.');
  app.core.subjects = app.core.subjects.filter((s) => s.id !== id);
  app.touch();
}

// ---------- Klassen und Schüler ----------

export function addClass(name: string, gradeLevel: number, wpf: WpfGroup): SchoolClass {
  const year = app.activeYear;
  if (!year) throw new Error('Bitte zuerst ein Schuljahr anlegen.');
  const c: SchoolClass = {
    v: 1,
    id: randomId(),
    yearId: year.id,
    name: name.trim(),
    gradeLevel,
    wpf,
    students: [],
    courses: [],
    createdAt: now(),
  };
  app.classes.push(c);
  app.classes.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
  app.touch(c.id);
  return app.classes.find((x) => x.id === c.id)!;
}

export function updateClass(cls: SchoolClass, patch: Partial<Pick<SchoolClass, 'name' | 'gradeLevel' | 'wpf'>>) {
  Object.assign(cls, patch);
  app.touch(cls.id);
}

export function addStudents(cls: SchoolClass, list: Array<Pick<Student, 'lastName' | 'firstName'>>): number {
  const seen = new Set(cls.students.map((s) => `${s.lastName}|${s.firstName}`.toLowerCase()));
  let added = 0;
  for (const s of list) {
    const lastName = s.lastName.trim();
    const firstName = s.firstName.trim();
    if (!lastName && !firstName) continue;
    const k = `${lastName}|${firstName}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    cls.students.push({ id: randomId(), lastName, firstName });
    added++;
  }
  app.touch(cls.id);
  return added;
}

export function updateStudent(cls: SchoolClass, id: string, patch: Partial<Omit<Student, 'id'>>) {
  const s = cls.students.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, patch);
  app.touch(cls.id);
}

export function removeStudent(cls: SchoolClass, id: string) {
  cls.students = cls.students.filter((s) => s.id !== id);
  for (const c of cls.courses) {
    c.grades = c.grades.filter((g) => g.studentId !== id);
    c.reportGrades = c.reportGrades.filter((r) => r.studentId !== id);
    c.excludedStudentIds = c.excludedStudentIds.filter((x) => x !== id);
  }
  for (const c of cls.courses) if (c.observations) c.observations = c.observations.filter((p) => p.studentId !== id);
  if (cls.notes) cls.notes = cls.notes.filter((n) => n.studentId !== id);
  if (cls.log) cls.log = cls.log.filter((e) => e.studentId !== id);
  if (cls.trash) cls.trash = cls.trash.filter((d) => d.grade.studentId !== id);
  app.touch(cls.id);
}

// ---------- Pädagogische Notizen ----------

export const NOTE_TOPICS: Record<NoteTopic, string> = {
  beobachtung: 'Beobachtung',
  lob: 'Lob',
  verhalten: 'Verhalten',
  eltern: 'Elternkontakt',
  massnahme: 'Maßnahme',
};

export function notesOf(cls: SchoolClass, studentId: string): StudentNote[] {
  return (cls.notes ?? []).filter((n) => n.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at));
}

export function addNote(cls: SchoolClass, studentId: string, input: Pick<StudentNote, 'at' | 'topic' | 'text'>): StudentNote {
  const t = now();
  const note: StudentNote = { id: randomId(), studentId, ...input, text: input.text.trim(), createdAt: t, updatedAt: t };
  cls.notes ??= [];
  cls.notes.push(note);
  log(cls, { kind: 'note_added', studentId, topic: note.topic });
  app.touch(cls.id);
  return note;
}

export function updateNote(cls: SchoolClass, id: string, patch: Partial<Pick<StudentNote, 'at' | 'topic' | 'text'>>) {
  const n = cls.notes?.find((x) => x.id === id);
  if (!n) return;
  Object.assign(n, patch, { updatedAt: now() });
  if (patch.text !== undefined) n.text = patch.text.trim();
  app.touch(cls.id);
}

export function removeNote(cls: SchoolClass, id: string) {
  cls.notes = (cls.notes ?? []).filter((n) => n.id !== id);
  app.touch(cls.id);
}

// ---------- Unterrichtsbeobachtung ----------

/** Startet eine Beobachtungsphase (oder liefert die bereits laufende). */
export function startObservation(cls: SchoolClass, course: Course, studentId: string): ObservationPhase {
  const running = course.observations?.find((p) => p.studentId === studentId && !p.closedAt);
  if (running) return running;
  const p: ObservationPhase = { id: randomId(), studentId, typeId: 'typ-unterrichtsbeitrag', startedAt: now(), entries: [] };
  course.observations ??= [];
  course.observations.push(p);
  app.touch(cls.id);
  return course.observations[course.observations.length - 1];
}

export function addObservation(cls: SchoolClass, phase: ObservationPhase, input: Pick<Observation, 'at' | 'stars' | 'text'>) {
  const t = now();
  phase.entries.push({ id: randomId(), ...input, text: input.text.trim(), createdAt: t, updatedAt: t });
  app.touch(cls.id);
}

export function updateObservation(cls: SchoolClass, phase: ObservationPhase, id: string, patch: Partial<Pick<Observation, 'at' | 'stars' | 'text'>>) {
  const o = phase.entries.find((x) => x.id === id);
  if (!o) return;
  Object.assign(o, patch, { updatedAt: now() });
  if (patch.text !== undefined) o.text = patch.text.trim();
  app.touch(cls.id);
}

export function removeObservation(cls: SchoolClass, phase: ObservationPhase, id: string) {
  phase.entries = phase.entries.filter((x) => x.id !== id);
  app.touch(cls.id);
}

/** Schließt die Phase mit einer Note ab (Einzelnote der Art der Phase). */
export function closeObservation(
  cls: SchoolClass,
  course: Course,
  phase: ObservationPhase,
  input: { value: GradeValue; performedAt: string; comment: string },
): Grade {
  const g = addSingleGrade(cls, course, phase.studentId, phase.typeId, '', { value: input.value, comment: input.comment, performedAt: input.performedAt }, null, {
    observationId: phase.id,
  });
  phase.closedAt = now();
  phase.gradeId = g.id;
  app.touch(cls.id);
  return g;
}

/** Verwirft eine laufende Phase samt Beobachtungen, ohne Note. */
export function discardObservation(cls: SchoolClass, course: Course, phase: ObservationPhase) {
  course.observations = (course.observations ?? []).filter((p) => p.id !== phase.id);
  app.touch(cls.id);
}

/** Noten eines Schülers in einem Unterricht, chronologisch, mit Bezeichnung und Gewicht. */
export function studentGradeRows(c: Course, studentId: string): Array<{ g: Grade; date: string; name: string; weight: number }> {
  const byId = new Map(c.assessments.map((a) => [a.id, a]));
  return c.grades
    .filter((g) => g.studentId === studentId)
    .map((g) => {
      const a = g.assessmentId ? byId.get(g.assessmentId) : undefined;
      const t = typeById(a ? a.typeId : g.typeId);
      return {
        g,
        date: a ? a.date : g.performedAt.slice(0, 10),
        name: a ? a.title : `${t?.name ?? 'Note'}${g.title ? ` · ${g.title}` : ''}`,
        weight: a ? (a.weight ?? t?.weight ?? 1) : (g.weight ?? t?.weight ?? 1),
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}

// ---------- Kurse ----------

export function addCourse(cls: SchoolClass, subjectId: string, weeklyHours: number, promotionSubject: boolean): Course {
  const subj = app.core.subjects.find((s) => s.id === subjectId);
  const c: Course = {
    id: randomId(),
    subjectId,
    weeklyHours,
    promotionSubject,
    plannedSchulaufgaben: (subj && plannedSchulaufgabenFor(subj.name, cls.gradeLevel, cls.wpf)) ?? 0,
    testModel: false,
    excludedStudentIds: [],
    assessments: [],
    grades: [],
    reportGrades: [],
  };
  cls.courses.push(c);
  app.touch(cls.id);
  return cls.courses[cls.courses.length - 1];
}

export function updateCourse(cls: SchoolClass, course: Course, patch: Partial<Omit<Course, 'id'>>) {
  Object.assign(course, patch);
  app.touch(cls.id);
}

export function removeCourse(cls: SchoolClass, id: string) {
  cls.courses = cls.courses.filter((c) => c.id !== id);
  if (cls.log) cls.log = cls.log.filter((e) => e.courseId !== id);
  if (cls.trash) cls.trash = cls.trash.filter((d) => d.courseId !== id);
  app.touch(cls.id);
}

// ---------- Leistungsnachweise ----------

export function addAssessment(
  cls: SchoolClass,
  course: Course,
  a: Omit<Assessment, 'id' | 'createdAt'>,
): Assessment {
  const item: Assessment = { ...a, id: randomId(), createdAt: now() };
  course.assessments.push(item);
  log(cls, { kind: 'assessment_added', courseId: course.id, assessmentId: item.id, typeId: item.typeId, title: item.title });
  app.touch(cls.id);
  return course.assessments[course.assessments.length - 1];
}

export function updateAssessment(cls: SchoolClass, course: Course, id: string, patch: Partial<Assessment>) {
  const a = course.assessments.find((x) => x.id === id);
  if (!a) return;
  Object.assign(a, patch);
  // Bei geänderter Punktzahl oder Schlüssel die Noten aus Punkten neu berechnen.
  if (a.maxPoints) {
    const key = gradeKeyById(a.gradeKeyId);
    for (const g of course.grades) {
      if (g.assessmentId !== a.id || g.points === null || g.status !== 'gewertet') continue;
      const v = gradeFromPoints(g.points, a.maxPoints, key);
      if (v !== g.value) recordChange(g, { value: v });
    }
  }
  app.touch(cls.id);
}

// ---------- Notenschlüssel ----------

interface KeyUse {
  cls: SchoolClass;
  course: Course;
  a: Assessment;
}

/** Leistungsnachweise mit Punkten, deren Noten nach diesem Schlüssel berechnet werden. */
export function gradeKeyUsage(keyId: string): KeyUse[] {
  const out: KeyUse[] = [];
  for (const cls of app.classes)
    for (const course of cls.courses)
      for (const a of course.assessments) if (a.maxPoints && gradeKeyById(a.gradeKeyId).id === keyId) out.push({ cls, course, a });
  return out;
}

/** Wie viele gewertete Noten sich beim Umstellen auf den Ersatzschlüssel ändern würden. */
export function gradeKeyChangeCount(keyId: string, replacementId: string): number {
  const repl = gradeKeyById(replacementId);
  let n = 0;
  for (const { course, a } of gradeKeyUsage(keyId))
    for (const g of course.grades)
      if (g.assessmentId === a.id && g.points !== null && g.status === 'gewertet' && gradeFromPoints(g.points, a.maxPoints!, repl) !== g.value) n++;
  return n;
}

/**
 * Löscht einen Notenschlüssel. Leistungsnachweise, die ihn verwenden, wechseln auf den
 * Ersatzschlüssel; Noten aus Punkten werden neu berechnet (mit Eintrag im Verlauf).
 */
export function removeGradeKey(keyId: string, replacementId: string) {
  if (keyId === replacementId || app.core.gradeKeys.length < 2) return;
  for (const { cls, course, a } of gradeKeyUsage(keyId)) updateAssessment(cls, course, a.id, { gradeKeyId: replacementId });
  if (app.core.settings.defaultGradeKeyId === keyId) app.core.settings.defaultGradeKeyId = replacementId;
  app.core.gradeKeys = app.core.gradeKeys.filter((k) => k.id !== keyId);
  app.touch();
}

export function removeAssessment(cls: SchoolClass, course: Course, id: string) {
  const a = course.assessments.find((x) => x.id === id);
  for (const g of course.grades) if (g.assessmentId === id) toTrash(cls, course, g, a, true);
  course.assessments = course.assessments.filter((x) => x.id !== id);
  course.grades = course.grades.filter((g) => g.assessmentId !== id);
  // Einträge zu den Noten dieses Nachweises entfallen mit ihm.
  if (cls.log) cls.log = cls.log.filter((e) => e.assessmentId !== id);
  if (a) log(cls, { kind: 'assessment_removed', courseId: course.id, typeId: a.typeId, title: a.title });
  app.touch(cls.id);
}

// ---------- Noten ----------

function recordChange(g: Grade, patch: Partial<Pick<Grade, 'value' | 'points' | 'status' | 'comment'>>) {
  g.history.push({ at: now(), value: g.value, points: g.points, status: g.status, comment: g.comment });
  Object.assign(g, patch);
}

/** Tiefe Kopie ohne reaktive Proxies (Noten sind reine JSON-Daten). */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Legt eine gelöschte Note samt Verlauf in den Papierkorb der Klasse. */
function toTrash(cls: SchoolClass, course: Course, g: Grade, a: Assessment | undefined, withAssessment = false) {
  const d: DeletedGrade = { grade: clone(g), courseId: course.id, deletedAt: now() };
  if (a) d.assessmentTitle = a.title;
  if (withAssessment) d.withAssessment = true;
  // Erst zuweisen, dann über den reaktiven Proxy anhängen – sonst geht der Eintrag verloren.
  cls.trash ??= [];
  cls.trash.push(d);
}

/** Ob sich ein Zeitpunkt auf die Minute genau unterscheidet (Eingabefelder kennen keine Sekunden). */
function minuteDiffers(a: string, b: string): boolean {
  return Math.floor(new Date(a).getTime() / 60_000) !== Math.floor(new Date(b).getTime() / 60_000);
}

/** Holt eine gelöschte Note aus dem Papierkorb zurück, sofern ihr Leistungsnachweis noch besteht und kein Ersatz eingetragen ist. */
export function restoreGrade(cls: SchoolClass, d: DeletedGrade): boolean {
  const course = cls.courses.find((c) => c.id === d.courseId);
  if (!course || !canRestore(cls, d)) return false;
  const g = clone(d.grade);
  g.history.push({ at: now(), value: g.value, points: g.points, status: g.status, comment: g.comment, restoredFrom: d.deletedAt });
  course.grades.push(g);
  cls.trash = (cls.trash ?? []).filter((x) => x !== d);
  log(cls, { kind: 'grade', courseId: course.id, studentId: g.studentId, assessmentId: g.assessmentId ?? undefined, typeId: g.assessmentId ? undefined : (g.typeId ?? undefined), value: g.value, status: g.status });
  app.touch(cls.id);
  return true;
}

export function canRestore(cls: SchoolClass, d: DeletedGrade): boolean {
  const course = cls.courses.find((c) => c.id === d.courseId);
  if (!course || !cls.students.some((s) => s.id === d.grade.studentId)) return false;
  if (!d.grade.assessmentId) return true;
  return course.assessments.some((a) => a.id === d.grade.assessmentId) && !course.grades.some((g) => g.assessmentId === d.grade.assessmentId && g.studentId === d.grade.studentId);
}

/** Entfernt Einträge endgültig aus dem Papierkorb (alle der Klasse oder einen). */
export function purgeTrash(cls: SchoolClass, d?: DeletedGrade) {
  cls.trash = d ? (cls.trash ?? []).filter((x) => x !== d) : [];
  app.touch(cls.id);
}

export interface GradeInput {
  value: GradeValue | null;
  points?: number | null;
  status?: GradeStatus;
  comment?: string;
  performedAt?: string;
  /** Zeitpunkt der Erfassung, falls er vor dem Speichern liegt (Sammeleingabe). */
  recordedAt?: string;
}

function normalize(input: GradeInput): Required<Omit<GradeInput, 'performedAt' | 'recordedAt'>> {
  const status = input.status ?? 'gewertet';
  let value = input.value;
  if (SIX_STATUSES.includes(status)) value = 6;
  if (status === 'nachtermin') value = null;
  return { value, points: input.points ?? null, status, comment: input.comment ?? '' };
}

/** Setzt die Note eines Schülers zu einem Leistungsnachweis (anlegen, ändern oder löschen). */
export function setAssessmentGrade(cls: SchoolClass, course: Course, assessment: Assessment, studentId: string, input: GradeInput | null) {
  const i = course.grades.findIndex((g) => g.assessmentId === assessment.id && g.studentId === studentId);
  const existing = i >= 0 ? course.grades[i] : undefined;
  if (!input || (input.value === null && input.points == null && (input.status ?? 'gewertet') === 'gewertet' && !input.comment)) {
    if (existing) {
      toTrash(cls, course, existing, assessment);
      course.grades.splice(i, 1);
      log(cls, { kind: 'grade_removed', courseId: course.id, studentId, assessmentId: assessment.id, prev: existing.value });
    }
    app.touch(cls.id);
    return;
  }
  const n = normalize(input);
  if (existing) {
    const same =
      existing.value === n.value && existing.points === n.points && existing.status === n.status && existing.comment === n.comment;
    if (!same) {
      if (existing.value !== n.value || existing.status !== n.status) {
        log(cls, { kind: 'grade', changed: true, courseId: course.id, studentId, assessmentId: assessment.id, value: n.value, prev: existing.value, status: n.status });
      }
      recordChange(existing, n);
    }
  } else {
    log(cls, { kind: 'grade', courseId: course.id, studentId, assessmentId: assessment.id, value: n.value, status: n.status });
    const t = now();
    course.grades.push({
      id: randomId(),
      studentId,
      assessmentId: assessment.id,
      typeId: null,
      weight: null,
      title: '',
      ...n,
      performedAt: input.performedAt ?? t,
      recordedAt: t,
      history: [],
    });
  }
  app.touch(cls.id);
}

/** Legt eine Einzelnote ohne Leistungsnachweis an (z. B. Unterrichtsbeitrag). */
export function addSingleGrade(
  cls: SchoolClass,
  course: Course,
  studentId: string,
  typeId: string,
  title: string,
  input: GradeInput,
  weight: number | null = null,
  extra: Partial<Pick<Grade, 'replacesAssessmentId' | 'observationId'>> = {},
): Grade {
  const t = now();
  const g: Grade = {
    id: randomId(),
    studentId,
    assessmentId: null,
    typeId,
    weight,
    title: title.trim(),
    ...(extra.replacesAssessmentId ? { replacesAssessmentId: extra.replacesAssessmentId } : {}),
    ...(extra.observationId ? { observationId: extra.observationId } : {}),
    ...normalize(input),
    performedAt: input.performedAt ?? t,
    recordedAt: input.recordedAt && input.recordedAt < t ? input.recordedAt : t,
    history: [],
  };
  course.grades.push(g);
  log(cls, { kind: 'grade', courseId: course.id, studentId, typeId, value: g.value, status: g.status });
  app.touch(cls.id);
  return g;
}

export function updateGrade(
  cls: SchoolClass,
  g: Grade,
  input: GradeInput & { title?: string; typeId?: string | null; weight?: number | null },
) {
  const n = normalize(input);
  const changed = g.value !== n.value || g.points !== n.points || g.status !== n.status || g.comment !== n.comment;
  if (g.value !== n.value || g.status !== n.status) {
    const course = cls.courses.find((c) => c.grades.includes(g));
    log(cls, {
      kind: 'grade',
      changed: true,
      courseId: course?.id,
      studentId: g.studentId,
      assessmentId: g.assessmentId ?? undefined,
      typeId: g.assessmentId ? undefined : (input.typeId ?? g.typeId ?? undefined),
      value: n.value,
      prev: g.value,
      status: n.status,
    });
  }
  // Geänderte Angaben zur Leistung kommen mit ihrem vorherigen Wert in den Verlauf.
  const meta: Partial<Pick<Grade, 'performedAt' | 'title' | 'typeId' | 'weight'>> = {};
  const prev: Partial<Pick<Grade, 'performedAt' | 'title' | 'typeId' | 'weight'>> = {};
  if (input.performedAt && minuteDiffers(input.performedAt, g.performedAt)) {
    meta.performedAt = input.performedAt;
    prev.performedAt = g.performedAt;
  }
  if (input.title !== undefined && input.title.trim() !== g.title) {
    meta.title = input.title.trim();
    prev.title = g.title;
  }
  if (!g.assessmentId && input.typeId !== undefined && input.typeId !== g.typeId) {
    meta.typeId = input.typeId;
    prev.typeId = g.typeId;
  }
  if (!g.assessmentId && input.weight !== undefined && input.weight !== g.weight) {
    meta.weight = input.weight;
    prev.weight = g.weight;
  }
  if (changed || Object.keys(meta).length) {
    g.history.push({ at: now(), value: g.value, points: g.points, status: g.status, comment: g.comment, ...prev });
    Object.assign(g, changed ? n : {}, meta);
  }
  app.touch(cls.id);
}

export function removeGrade(cls: SchoolClass, course: Course, id: string) {
  const g = course.grades.find((x) => x.id === id);
  if (g) {
    toTrash(cls, course, g, g.assessmentId ? course.assessments.find((a) => a.id === g.assessmentId) : undefined);
    log(cls, {
      kind: 'grade_removed',
      courseId: course.id,
      studentId: g.studentId,
      assessmentId: g.assessmentId ?? undefined,
      typeId: g.assessmentId ? undefined : (g.typeId ?? undefined),
      prev: g.value,
    });
  }
  course.grades = course.grades.filter((x) => x.id !== id);
  app.touch(cls.id);
}

// ---------- Zeugnisnoten ----------

export function setReportGrade(cls: SchoolClass, course: Course, studentId: string, term: ReportTerm, value: GradeValue | null) {
  const i = course.reportGrades.findIndex((r) => r.studentId === studentId && r.term === term);
  const prev = i >= 0 ? course.reportGrades[i].value : null;
  if (prev !== value) log(cls, { kind: 'report_grade', courseId: course.id, studentId, term, value, prev });
  if (value === null) {
    if (i >= 0) course.reportGrades.splice(i, 1);
  } else if (i >= 0) {
    course.reportGrades[i] = { studentId, term, value, setAt: now() };
  } else {
    course.reportGrades.push({ studentId, term, value, setAt: now() });
  }
  app.touch(cls.id);
}

// ---------- Hilfen für Datum und Zeit ----------

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Wert für <input type="datetime-local"> aus ISO-Zeit. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

export function fmtDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function fmtShortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
