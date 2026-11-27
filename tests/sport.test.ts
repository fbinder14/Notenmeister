import { describe, expect, it } from 'vitest';
import { defaultTypes, emptyCore, ensureBuiltinTypes, plannedSchulaufgabenFor, weeklyHoursFor } from '../src/lib/domain/defaults';
import { type Ctx } from '../src/lib/domain/grading';
import { courseDefaults, demoClass } from '../src/lib/domain/onboarding';
import { courseWarnings, needsOral, studentCompleteness } from '../src/lib/domain/rules';
import {
  bestOf,
  formatMeasure,
  gradeFromMeasure,
  improvementGrade,
  isSportCourse,
  isSportSubject,
  measurePart,
  notePart,
  parseMeasure,
  preferredTypeId,
  progressDetail,
  sportGroupFromName,
  sportOutcome,
  templateSpec,
  typesFor,
  validThresholds,
} from '../src/lib/domain/sport';
import { DISCIPLINES, disciplineById, isbThresholds } from '../src/lib/domain/sportTables';
import type { Assessment, Course, Grade, SchoolClass, SchoolYear, SportPartMeasure, Subject } from '../src/lib/domain/types';

const year: SchoolYear = { id: 'y', name: '2026/27', start: '2026-09-15', halfSwitch: '2027-02-13', end: '2027-07-30' };
const types = defaultTypes();
const ctx: Ctx = { types: new Map(types.map((t) => [t.id, t])), year };
const sportSubject: Subject = { id: 'sp', name: 'Sport (Mädchen)', short: 'SpM', color: 'emerald', sport: 'w' };
const mathe: Subject = { id: 'm', name: 'Mathematik', short: 'M', color: 'indigo' };

function course(over: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    subjectId: 'sp',
    weeklyHours: 2,
    promotionSubject: false,
    plannedSchulaufgaben: 0,
    testModel: false,
    excludedStudentIds: [],
    assessments: [],
    grades: [],
    reportGrades: [],
    ...over,
  };
}

function grade(studentId: string, over: Partial<Grade>): Grade {
  return {
    id: Math.random().toString(36),
    studentId,
    assessmentId: null,
    typeId: null,
    weight: null,
    title: '',
    value: null,
    points: null,
    status: 'gewertet',
    comment: '',
    performedAt: '2026-10-01T09:00:00.000Z',
    recordedAt: '2026-10-01T09:00:00.000Z',
    history: [],
    ...over,
  };
}

const assessment = (id: string, date: string, over: Partial<Assessment> = {}): Assessment => ({
  id,
  typeId: 'typ-sport_praktisch',
  title: id,
  date,
  weight: null,
  maxPoints: null,
  gradeKeyId: null,
  createdAt: '2026-09-20T00:00:00Z',
  ...over,
});

describe('Fachprofil Sport', () => {
  it('erkennt Sport und die Wertungstabelle am Namen', () => {
    expect(sportGroupFromName('Sport (Mädchen)')).toBe('w');
    expect(sportGroupFromName('Sport (Jungen)')).toBe('m');
    expect(sportGroupFromName('Sport')).toBeUndefined();
    expect(sportGroupFromName('Mathematik')).toBeUndefined();
    expect(isSportSubject({ name: 'Sport', sport: undefined })).toBe(true);
    expect(isSportSubject(mathe)).toBe(false);
    expect(isSportCourse(course(), [sportSubject, mathe])).toBe(true);
    expect(isSportCourse(course({ subjectId: 'm' }), [sportSubject, mathe])).toBe(false);
  });

  it('Sport: keine Schulaufgaben, 2 Wochenstunden, kein Vorrückungsfach', () => {
    expect(plannedSchulaufgabenFor('Sport (Jungen)', 8, 'II')).toBeNull();
    expect(weeklyHoursFor('Sport (Mädchen)', 8, 'II')).toBe(2);
    const d = courseDefaults('Sport (Mädchen)', 8, 'II');
    expect(d).toMatchObject({ weeklyHours: 2, plannedSchulaufgaben: 0, promotionSubject: false });
    expect(courseDefaults('Mathematik', 8, 'II').promotionSubject).toBe(true);
    // Kein Vorrückungsfach → keine Pflicht zur mündlichen Note.
    expect(needsOral(course())).toBe(false);
  });
});

describe('Notenarten und Vorauswahl', () => {
  it('Sportkurse sehen nur Sport-Arten (plus eigene und gleichwertige), andere keine Sport-Arten', () => {
    const sport = typesFor(types, true, 'assessment').map((t) => t.kind);
    expect(sport).toContain('sport_praktisch');
    expect(sport).not.toContain('schulaufgabe');
    expect(sport).not.toContain('stegreifaufgabe');
    expect(sport).not.toContain('rechenschaftsablage');
    const other = typesFor(types, false, 'assessment').map((t) => t.kind);
    expect(other).toContain('schulaufgabe');
    expect(other.some((k) => k.startsWith('sport_'))).toBe(false);
    expect(typesFor(types, false, 'single').some((t) => t.scope === 'sport')).toBe(false);
  });

  it('wählt im Sport den sportpraktischen Nachweis vor, sonst wie bisher', () => {
    const c = course();
    expect(preferredTypeId(typesFor(types, true, 'assessment'), c, true, 'assessment')).toBe('typ-sport_praktisch');
    expect(preferredTypeId(typesFor(types, true, 'quick'), c, true, 'quick')).toBe('typ-sport_praktisch');
    expect(preferredTypeId(typesFor(types, true, 'single'), c, true, 'observation')).toBe('typ-sport_einsatz');
    expect(preferredTypeId(typesFor(types, false, 'assessment'), c, false, 'assessment')).toBe('typ-schulaufgabe');
    expect(preferredTypeId(typesFor(types, false, 'assessment'), { testModel: true }, false, 'assessment')).toBe('typ-angesagter_test');
    expect(preferredTypeId(typesFor(types, false, 'quick'), c, false, 'quick')).toBe('typ-rechenschaftsablage');
  });

  it('trägt fehlende fest eingebaute Arten in alte Datenstände nach, ohne Vorhandenes zu ändern', () => {
    const core = emptyCore();
    core.types = core.types.filter((t) => t.scope !== 'sport');
    core.types[0].weight = 3;
    expect(ensureBuiltinTypes(core)).toBe(true);
    expect(core.types.filter((t) => t.scope === 'sport')).toHaveLength(3);
    expect(core.types[0].weight).toBe(3);
    expect(ensureBuiltinTypes(core)).toBe(false);
  });
});

describe('Messwerte', () => {
  it('liest Zeiten und Weiten mit Komma, Punkt und Minuten', () => {
    expect(parseMeasure('8,4', 's')).toBe(8.4);
    expect(parseMeasure('8.4', 's')).toBe(8.4);
    expect(parseMeasure('3:45', 's')).toBe(225);
    expect(parseMeasure('1:20,3', 's')).toBe(80.3);
    expect(parseMeasure('3:75', 's')).toBeNull();
    expect(parseMeasure('4,35', 'm')).toBe(4.35);
    expect(parseMeasure('abc', 'm')).toBeNull();
    expect(parseMeasure('', 'm')).toBeNull();
  });

  it('zeigt Messwerte deutsch an', () => {
    expect(formatMeasure(8.4, 's')).toBe('8,4');
    expect(formatMeasure(225, 's')).toBe('3:45');
    expect(formatMeasure(80.3, 's')).toBe('1:20,3');
    expect(formatMeasure(4.3, 'm')).toBe('4,30');
    expect(formatMeasure(42, 'n')).toBe('42');
  });

  it('nimmt den besten Versuch', () => {
    expect(bestOf([8.6, null, 8.4], 'low')).toBe(8.4);
    expect(bestOf([3.9, 4.12, null], 'high')).toBe(4.12);
    expect(bestOf([null], 'high')).toBeNull();
  });

  it('rechnet Messwerte in Noten um, Grenzen einschließlich (Zeiten und Weiten)', () => {
    const t50 = isbThresholds('sprint50', 5, 'w')!; // 8,7 / 9,3 / 9,9 / 10,6 / 11,5
    expect(t50).toEqual([8.7, 9.3, 9.9, 10.6, 11.5]);
    expect(gradeFromMeasure(8.7, t50, 'low')).toBe(1);
    expect(gradeFromMeasure(8.8, t50, 'low')).toBe(2);
    expect(gradeFromMeasure(11.5, t50, 'low')).toBe(5);
    expect(gradeFromMeasure(11.6, t50, 'low')).toBe(6);
    const weit = isbThresholds('weit', 10, 'm')!; // 4,77 / 4,40 / 3,96 / 3,46 / 2,92
    expect(gradeFromMeasure(4.77, weit, 'high')).toBe(1);
    expect(gradeFromMeasure(4.76, weit, 'high')).toBe(2);
    expect(gradeFromMeasure(2.91, weit, 'high')).toBe(6);
  });

  it('enthält die ISB-Tabellen (Stichproben gegen das PDF)', () => {
    expect(isbThresholds('kugel4', 10, 'w')![1]).toBe(6.5);
    expect(isbThresholds('weit', 6, 'w')![4]).toBe(1.99);
    expect(isbThresholds('lauf12min', 9, 'w')![4]).toBe(1400);
    expect(isbThresholds('brust100', 9, 'm')![1]).toBe(129.9);
    expect(isbThresholds('ausdauerLauf', 9, 'm')![4]).toBe(780);
    expect(isbThresholds('sprint50', 9, 'm')).toBeNull();
    // Alle Reihen laufen in Richtung „schlechter“.
    for (const d of DISCIPLINES)
      for (const [lvl, g] of Object.entries(d.levels))
        for (const t of Object.values(g!)) expect(validThresholds(t, d.better), `${d.id} Jgst. ${lvl}`).toBe(true);
  });

  it('liefert Kopien der Tabellenwerte', () => {
    const t = isbThresholds('sprint50', 5, 'w')!;
    t[0] = 1;
    expect(isbThresholds('sprint50', 5, 'w')![0]).toBe(8.7);
  });
});

describe('Leistungsfortschritt (ISB 2023)', () => {
  const part = { thresholds: [76, 78, 80, 82, 84] as [number, number, number, number, number], better: 'low' as const };

  it('Verbesserungsnoten ab 5/4/3/2/1 %, darunter keine', () => {
    expect(improvementGrade(5)).toBe(1);
    expect(improvementGrade(4.8)).toBe(2);
    expect(improvementGrade(1)).toBe(5);
    expect(improvementGrade(0.9)).toBeNull();
  });

  it('(Eingang + Ausgang + 3 × Verbesserung) / 5', () => {
    // 80,3 s → 76,4 s: Eingang 4, Ausgang 2, Verbesserung 4,86 % → 2 → (4 + 2 + 6) / 5 = 2,4; nicht schlechter als 2 → 2.
    const d = progressDetail(80.3, 76.4, part);
    expect(d.entryGrade).toBe(4);
    expect(d.exitGrade).toBe(2);
    expect(d.percent).toBeCloseTo(4.857, 2);
    expect(d.improvementGrade).toBe(2);
    expect(d.raw).toBe(2);
    expect(d.capped).toBe(true);
    // Große Steigerung ohne Begrenzung: 84 → 79: Eingang 5, Ausgang 3, +5,95 % → 1 → (5 + 3 + 3) / 5 = 2,2.
    const e = progressDetail(84, 79, part);
    expect(e.raw).toBeCloseTo(2.2);
    expect(e.capped).toBe(false);
  });

  it('Sonderfall ohne Verbesserung: bessere Testnote', () => {
    const d = progressDetail(77, 77.1, part);
    expect(d.improvementGrade).toBeNull();
    expect(d.raw).toBe(2);
  });

  it('funktioniert auch bei Weiten (größer ist besser)', () => {
    const d = progressDetail(3.0, 3.3, { thresholds: [4, 3.6, 3.2, 2.8, 2.2], better: 'high' });
    expect(d.percent).toBeCloseTo(10);
    expect(d.improvementGrade).toBe(1);
  });
});

describe('Teilnoten zusammenführen', () => {
  it('Technik + Leistung je zur Hälfte, Rundung nach Einstellung', () => {
    const spec = templateSpec('technik_leistung', 'leichtathletik', disciplineById('sprint75')!, 8, 'w');
    const [tech, run] = spec.parts as [ReturnType<typeof notePart>, SportPartMeasure];
    expect(run.thresholds).toEqual(isbThresholds('sprint75', 8, 'w'));
    // Technik 2, Lauf Note 3 → 2,5
    const res = { parts: { [tech.id]: { value: 2 as const }, [run.id]: { attempts: [run.thresholds[2], run.thresholds[2] + 0.5] } } };
    expect(sportOutcome(spec, res, 'mild').value).toBe(2);
    expect(sportOutcome(spec, res, 'streng').value).toBe(3);
    expect(sportOutcome(spec, res, 'mild').raw).toBeCloseTo(2.5);
  });

  it('bleibt offen, solange ein Teil fehlt; Gewicht 0 zählt nicht', () => {
    const spec = { field: 'spiele' as const, parts: [notePart('Technik', 2), notePart('Taktik', 1), notePart('Bonus', 0)] };
    const [a, b] = spec.parts;
    expect(sportOutcome(spec, { parts: { [a.id]: { value: 1 } } }, 'mild').value).toBeNull();
    // (1 × 2 + 4 × 1) / 3 = 2
    expect(sportOutcome(spec, { parts: { [a.id]: { value: 1 }, [b.id]: { value: 4 } } }, 'mild').value).toBe(2);
  });

  it('Messteil ohne Tabelle (keine Wertungstabelle gewählt) bekommt Platzhalter-Grenzen', () => {
    const p = measurePart(disciplineById('sprint75')!, 8, undefined);
    expect(validThresholds(p.thresholds, p.better)).toBe(true);
    expect(p.attempts).toBe(2);
  });
});

describe('Regeln im Sport', () => {
  const students = [
    { id: 's1', lastName: 'Huber', firstName: 'Lena' },
    { id: 's2', lastName: 'Öztürk', firstName: 'Can' },
  ];
  const cls = (c: Course): SchoolClass => ({ v: 1, id: 'k', yearId: 'y', name: '8b', gradeLevel: 8, wpf: 'II', students, courses: [c], createdAt: '' });

  it('Befreiung zählt nicht als fehlende Note und weist auf die Zeugnisbemerkung hin', () => {
    const a1 = assessment('a1', '2026-10-10');
    const c = course({ assessments: [a1], grades: [grade('s1', { assessmentId: 'a1', status: 'befreit' })] });
    const r = studentCompleteness(c, 's1', ctx, 1);
    expect(r.missing.some((m) => m.includes('ohne Note'))).toBe(false);
    expect(r.missing.some((m) => m.includes('befreit'))).toBe(true);
    expect(r.missing.some((m) => m.includes('mündlich'))).toBe(false);
  });

  it('meldet, wenn im Halbjahr nur ein Handlungsfeld bewertet wurde', () => {
    const spec = templateSpec('leistung', 'leichtathletik', disciplineById('sprint75')!, 8, 'w');
    const a1 = assessment('a1', '2026-10-10', { sport: spec });
    const a2 = assessment('a2', '2026-12-10', { sport: { ...spec, field: 'leichtathletik' } });
    const core = { ...emptyCore(), subjects: [sportSubject], years: [year] };
    const w = courseWarnings(cls(course({ assessments: [a1, a2] })), course({ assessments: [a1, a2] }), core, year, '2027-02-01');
    expect(w.some((x) => x.id.endsWith('felder-1'))).toBe(true);
    const a3 = assessment('a3', '2027-01-10', { sport: { field: 'spiele', parts: [notePart('Technik')] } });
    const c2 = course({ assessments: [a1, a2, a3] });
    expect(courseWarnings(cls(c2), c2, core, year, '2027-02-01').some((x) => x.id.endsWith('felder-1'))).toBe(false);
    // Kein Hinweis für andere Fächer.
    const m = course({ subjectId: 'm', assessments: [a1, a2] });
    expect(courseWarnings(cls(m), m, { ...core, subjects: [mathe] }, year, '2027-02-01').some((x) => x.id.includes('felder'))).toBe(false);
  });
});

describe('Beispielklasse Sport', () => {
  it('nutzt Messwerte und Teilnoten statt Schulaufgabe und Stegreifaufgabe', () => {
    const c = demoClass(year, sportSubject, '2026-11-26', '2026-11-26T08:00:00Z');
    const k = c.courses[0];
    expect(k.promotionSubject).toBe(false);
    expect(k.plannedSchulaufgaben).toBe(0);
    expect(k.assessments.every((a) => a.typeId === 'typ-sport_praktisch' && a.sport)).toBe(true);
    const lauf = k.assessments[0];
    const graded = k.grades.filter((g) => g.assessmentId === lauf.id && g.status === 'gewertet');
    expect(graded.length).toBe(c.students.length - 1);
    for (const g of graded) expect(g.value).toBe(sportOutcome(lauf.sport!, g.sport, 'mild').value);
    expect(k.grades.some((g) => g.status === 'befreit')).toBe(true);
  });
});
