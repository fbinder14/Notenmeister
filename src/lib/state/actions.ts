import { randomId } from '../crypto/encoding';
import { plannedSchulaufgabenFor, SUBJECT_COLORS } from '../domain/defaults';
import { gradeFromPoints } from '../domain/gradeKey';
import type {
  Assessment,
  AssessmentType,
  Course,
  Grade,
  GradeKey,
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

export const SIX_STATUSES: GradeStatus[] = ['versaeumt', 'verweigert', 'unterschleif'];

export const STATUS_LABEL: Record<GradeStatus, string> = {
  gewertet: 'Gewertet',
  nachtermin: 'Entschuldigt versäumt – Nachtermin offen',
  versaeumt: 'Unentschuldigt versäumt (Note 6)',
  verweigert: 'Leistung verweigert (Note 6)',
  unterschleif: 'Unterschleif (Note 6)',
  nicht_gewertet: 'Nicht gewertet',
};

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
  return s;
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
  if (subjectInUse(id)) throw new Error('Das Fach wird noch in einem Kurs verwendet.');
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
  return c;
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
  app.touch(cls.id);
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
  return c;
}

export function updateCourse(cls: SchoolClass, course: Course, patch: Partial<Omit<Course, 'id'>>) {
  Object.assign(course, patch);
  app.touch(cls.id);
}

export function removeCourse(cls: SchoolClass, id: string) {
  cls.courses = cls.courses.filter((c) => c.id !== id);
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
  app.touch(cls.id);
  return item;
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

export function removeAssessment(cls: SchoolClass, course: Course, id: string) {
  course.assessments = course.assessments.filter((a) => a.id !== id);
  course.grades = course.grades.filter((g) => g.assessmentId !== id);
  app.touch(cls.id);
}

// ---------- Noten ----------

function recordChange(g: Grade, patch: Partial<Pick<Grade, 'value' | 'points' | 'status' | 'comment'>>) {
  g.history.push({ at: now(), value: g.value, points: g.points, status: g.status, comment: g.comment });
  Object.assign(g, patch);
}

export interface GradeInput {
  value: GradeValue | null;
  points?: number | null;
  status?: GradeStatus;
  comment?: string;
  performedAt?: string;
}

function normalize(input: GradeInput): Required<Omit<GradeInput, 'performedAt'>> {
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
    if (existing) course.grades.splice(i, 1);
    app.touch(cls.id);
    return;
  }
  const n = normalize(input);
  if (existing) {
    const same =
      existing.value === n.value && existing.points === n.points && existing.status === n.status && existing.comment === n.comment;
    if (!same) recordChange(existing, n);
  } else {
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
): Grade {
  const t = now();
  const g: Grade = {
    id: randomId(),
    studentId,
    assessmentId: null,
    typeId,
    weight,
    title: title.trim(),
    ...normalize(input),
    performedAt: input.performedAt ?? t,
    recordedAt: t,
    history: [],
  };
  course.grades.push(g);
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
  if (changed) recordChange(g, n);
  if (input.performedAt && input.performedAt !== g.performedAt) g.performedAt = input.performedAt;
  if (input.title !== undefined) g.title = input.title.trim();
  if (input.typeId !== undefined && !g.assessmentId) g.typeId = input.typeId;
  if (input.weight !== undefined && !g.assessmentId) g.weight = input.weight;
  app.touch(cls.id);
}

export function removeGrade(cls: SchoolClass, course: Course, id: string) {
  course.grades = course.grades.filter((g) => g.id !== id);
  app.touch(cls.id);
}

// ---------- Zeugnisnoten ----------

export function setReportGrade(cls: SchoolClass, course: Course, studentId: string, term: ReportTerm, value: GradeValue | null) {
  const i = course.reportGrades.findIndex((r) => r.studentId === studentId && r.term === term);
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
