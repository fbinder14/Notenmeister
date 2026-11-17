import { describe, expect, it } from 'vitest';
import { defaultGradeKeys, defaultTypes, emptyCore, plannedSchulaufgabenFor } from '../src/lib/domain/defaults';
import { gradeFromPoints, pointRanges, pointThresholds, validateThresholds } from '../src/lib/domain/gradeKey';
import { entriesFor, formatAvg, summarize, suggestGrade, weightedAverage, type Ctx } from '../src/lib/domain/grading';
import { classWarnings, courseWarnings, studentCompleteness } from '../src/lib/domain/rules';
import type { Course, Grade, GradeStatus, GradeValue, SchoolClass, SchoolYear } from '../src/lib/domain/types';

const year: SchoolYear = { id: 'y', name: '2026/27', start: '2026-09-15', halfSwitch: '2027-02-13', end: '2027-07-30' };
const types = defaultTypes();
const ctx: Ctx = { types: new Map(types.map((t) => [t.id, t])), year };
const key = defaultGradeKeys()[0]; // 92/81/67/50/30, Schritt 0,5

let n = 0;
function grade(studentId: string, value: GradeValue | null, opts: Partial<Grade> = {}): Grade {
  n++;
  return {
    id: `g${n}`,
    studentId,
    assessmentId: null,
    typeId: 'typ-unterrichtsbeitrag',
    weight: null,
    title: '',
    value,
    points: null,
    status: 'gewertet' as GradeStatus,
    comment: '',
    performedAt: '2026-10-01T09:00:00.000Z',
    recordedAt: '2026-10-01T09:00:00.000Z',
    history: [],
    ...opts,
  };
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    subjectId: 'sub',
    weeklyHours: 3,
    promotionSubject: true,
    plannedSchulaufgaben: 3,
    testModel: false,
    excludedStudentIds: [],
    assessments: [],
    grades: [],
    reportGrades: [],
    ...over,
  };
}

function cls(c: Course[]): SchoolClass {
  return {
    v: 1,
    id: 'k',
    yearId: 'y',
    name: '8b',
    gradeLevel: 8,
    wpf: 'II',
    students: [
      { id: 's1', lastName: 'Huber', firstName: 'Lena' },
      { id: 's2', lastName: 'Öztürk', firstName: 'Can' },
    ],
    courses: c,
    createdAt: '2026-09-15T00:00:00Z',
  };
}

describe('Notenschlüssel', () => {
  it('berechnet Punktgrenzen aufgerundet auf halbe Punkte', () => {
    expect(pointThresholds(key, 50)).toEqual([46, 40.5, 33.5, 25, 15]);
    expect(pointThresholds(key, 37)).toEqual([34.5, 30, 25, 18.5, 11.5]);
  });

  it('ordnet Punkte an den Grenzen richtig zu', () => {
    expect(gradeFromPoints(50, 50, key)).toBe(1);
    expect(gradeFromPoints(46, 50, key)).toBe(1);
    expect(gradeFromPoints(45.5, 50, key)).toBe(2);
    expect(gradeFromPoints(25, 50, key)).toBe(4);
    expect(gradeFromPoints(24.5, 50, key)).toBe(5);
    expect(gradeFromPoints(14.5, 50, key)).toBe(6);
    expect(gradeFromPoints(0, 50, key)).toBe(6);
  });

  it('liefert lückenlose Punktbereiche', () => {
    const r = pointRanges(key, 50);
    expect(r[0]).toEqual({ grade: 1, from: 50, to: 46 });
    expect(r[1]).toEqual({ grade: 2, from: 45.5, to: 40.5 });
    expect(r[5]).toEqual({ grade: 6, from: 14.5, to: 0 });
  });

  it('prüft Grenzen auf Plausibilität', () => {
    expect(validateThresholds([90, 80, 70, 60, 50])).toBeNull();
    expect(validateThresholds([90, 90, 70, 60, 50])).toMatch(/kleiner/);
    expect(validateThresholds([90, 80])).toMatch(/fünf/);
  });
});

describe('Schnittberechnung (RSO § 23)', () => {
  it('Schulaufgaben zählen doppelt', () => {
    const c = course({
      assessments: [
        { id: 'a1', typeId: 'typ-schulaufgabe', title: '1. SA', date: '2026-10-20', weight: null, maxPoints: null, gradeKeyId: null, createdAt: '' },
      ],
      grades: [
        grade('s1', 2, { assessmentId: 'a1', typeId: null }),
        grade('s1', 4, { typeId: 'typ-stegreifaufgabe' }),
        grade('s1', 3, { typeId: 'typ-unterrichtsbeitrag' }),
      ],
    });
    const s = summarize(entriesFor(c, 's1', ctx));
    expect(s.total).toBeCloseTo((2 * 2 + 4 + 3) / 4);
    expect(s.countOral).toBe(1);
  });

  it('nicht gewertete Noten und offene Nachtermine zählen nicht, Note 6 bei Versäumnis zählt', () => {
    const c = course({
      grades: [
        grade('s1', 1),
        grade('s1', 5, { status: 'nicht_gewertet' }),
        grade('s1', null, { status: 'nachtermin' }),
        grade('s1', 6, { status: 'versaeumt' }),
      ],
    });
    expect(summarize(entriesFor(c, 's1', ctx)).total).toBe(3.5);
  });

  it('trennt nach Halbjahren', () => {
    const c = course({
      grades: [grade('s1', 1, { performedAt: '2026-11-01T10:00:00Z' }), grade('s1', 5, { performedAt: '2027-03-01T10:00:00Z' })],
    });
    expect(summarize(entriesFor(c, 's1', ctx, 1)).total).toBe(1);
    expect(summarize(entriesFor(c, 's1', ctx, 2)).total).toBe(5);
    expect(summarize(entriesFor(c, 's1', ctx)).total).toBe(3);
  });

  it('eigenes Gewicht überschreibt die Vorgabe', () => {
    expect(weightedAverage([{ value: 1, weight: 3 }, { value: 5, weight: 1 }])).toBe(2);
    expect(weightedAverage([])).toBeNull();
  });

  it('Vorschlag und Anzeige', () => {
    expect(suggestGrade(2.5, 'streng')).toBe(3);
    expect(suggestGrade(2.5, 'mild')).toBe(2);
    expect(suggestGrade(2.49, 'streng')).toBe(2);
    expect(suggestGrade(2.51, 'mild')).toBe(3);
    expect(suggestGrade(null, 'mild')).toBeNull();
    expect(formatAvg(2.499)).toBe('2,49');
    expect(formatAvg(3)).toBe('3,00');
  });
});

describe('RSO-Warnungen', () => {
  const core = { ...emptyCore(), subjects: [{ id: 'sub', name: 'Mathematik', short: 'M', color: 'indigo' }] };

  it('meldet fehlende kleine und mündliche Leistungsnachweise nach Halbjahresende', () => {
    const c = course({ grades: [grade('s1', 2, { typeId: 'typ-stegreifaufgabe' }), grade('s1', 3)] });
    const w = courseWarnings(cls([c]), c, core, year, '2027-02-20');
    const small = w.find((x) => x.id === 'c1-klein-1');
    expect(small?.severity).toBe('warn');
    expect(small?.detail).toMatch(/Can Öztürk/);
    expect(small?.detail).not.toMatch(/Lena/);
    expect(w.find((x) => x.id === 'c1-muendlich-1')?.detail).toMatch(/Can/);
  });

  it('meldet nichts mitten im Halbjahr', () => {
    const c = course();
    const w = courseWarnings(cls([c]), c, core, year, '2026-10-10');
    expect(w.filter((x) => x.id.includes('klein') || x.id.includes('muendlich'))).toHaveLength(0);
  });

  it('Testmodell: nur ein mündlicher Nachweis nötig', () => {
    const c = course({ testModel: true, grades: [grade('s1', 2), grade('s2', 3)] });
    const w = courseWarnings(cls([c]), c, core, year, '2027-02-20');
    expect(w.some((x) => x.id.startsWith('c1-klein'))).toBe(false);
    expect(w.some((x) => x.id.startsWith('c1-muendlich'))).toBe(false);
  });

  it('meldet offene Nachtermine und Schulaufgaben ohne doppeltes Gewicht', () => {
    const c = course({
      assessments: [{ id: 'a1', typeId: 'typ-schulaufgabe', title: '1. SA', date: '2026-10-20', weight: 1, maxPoints: null, gradeKeyId: null, createdAt: '' }],
      grades: [grade('s2', null, { assessmentId: 'a1', typeId: null, status: 'nachtermin' })],
    });
    const w = courseWarnings(cls([c]), c, core, year, '2026-10-25');
    expect(w.find((x) => x.id === 'c1-nachtermin')?.detail).toMatch(/Can/);
    expect(w.find((x) => x.id === 'a1-gewicht')?.rule).toBe('RSO § 23 Abs. 2 Satz 3');
  });

  it('meldet zwei angekündigte Nachweise am selben Tag und eine Ex am Schulaufgabentag', () => {
    const a = (id: string, typeId: string, date: string) => ({ id, typeId, title: '', date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: '' });
    const c1 = course({ id: 'c1', assessments: [a('x1', 'typ-schulaufgabe', '2026-11-10')] });
    const c2 = course({ id: 'c2', assessments: [a('x2', 'typ-kurzarbeit', '2026-11-10'), a('x3', 'typ-stegreifaufgabe', '2026-11-10')] });
    const w = classWarnings(cls([c1, c2]), core);
    expect(w.some((x) => x.rule === 'RSO § 17 Abs. 3 Satz 2' && x.severity === 'warn')).toBe(true);
    expect(w.some((x) => x.rule === 'RSO § 17 Abs. 3 Satz 3')).toBe(true);
  });

  it('meldet mehr als drei angekündigte Nachweise pro Woche', () => {
    const a = (id: string, date: string) => ({ id, typeId: 'typ-kurzarbeit', title: '', date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: '' });
    const c = course({ assessments: [a('1', '2026-11-09'), a('2', '2026-11-10'), a('3', '2026-11-11'), a('4', '2026-11-12')] });
    expect(classWarnings(cls([c]), core).some((x) => x.severity === 'info' && x.title.includes('KW46'))).toBe(true);
  });
});

describe('Schulaufgaben nach RSO § 18 Abs. 1', () => {
  it('liefert die Anzahl je Fach, Jahrgangsstufe und Gruppe', () => {
    expect(plannedSchulaufgabenFor('Deutsch', 9, '')).toBe(3);
    expect(plannedSchulaufgabenFor('Mathematik', 7, 'I')).toBe(4);
    expect(plannedSchulaufgabenFor('Mathematik', 7, 'II')).toBe(3);
    expect(plannedSchulaufgabenFor('Betriebswirtschaftslehre/Rechnungswesen', 7, 'II')).toBe(3);
    expect(plannedSchulaufgabenFor('Physik', 7, 'II')).toBeNull();
    expect(plannedSchulaufgabenFor('Geschichte', 8, 'I')).toBeNull();
  });
});

describe('Vollständigkeit je Halbjahr', () => {
  const sa = { id: 'a1', typeId: 'typ-schulaufgabe', title: '1. SA', date: '2026-11-10', weight: null, maxPoints: null, gradeKeyId: null, createdAt: '' };

  it('vollständig mit zwei kleinen, davon einem mündlichen, und Note zur Schulaufgabe', () => {
    const c = course({
      assessments: [sa],
      grades: [grade('s1', 2, { assessmentId: 'a1', typeId: null }), grade('s1', 3, { typeId: 'typ-stegreifaufgabe' }), grade('s1', 2)],
    });
    expect(studentCompleteness(c, 's1', ctx, 1)).toEqual({ complete: true, missing: [] });
    expect(studentCompleteness(c, 's1', ctx, 2).complete).toBe(false);
  });

  it('meldet fehlende Schulaufgabennote, mündliche Note und offenen Nachtermin', () => {
    const c = course({
      assessments: [sa],
      grades: [grade('s1', null, { assessmentId: 'a1', typeId: null, status: 'nachtermin' }), grade('s1', 3, { typeId: 'typ-stegreifaufgabe' })],
    });
    const r = studentCompleteness(c, 's1', ctx, 1);
    expect(r.complete).toBe(false);
    expect(r.missing.join(' ')).toMatch(/1 von 2 kleinen/);
    expect(r.missing.join(' ')).toMatch(/mündlicher/);
    expect(r.missing.join(' ')).toMatch(/1 Leistungsnachweis ohne Note/);
  });

  it('nicht gewertete Schulaufgabe gilt als erledigt; Testmodell braucht nur den mündlichen', () => {
    const c = course({ testModel: true, assessments: [sa], grades: [grade('s1', null, { assessmentId: 'a1', typeId: null, status: 'nicht_gewertet' }), grade('s1', 2)] });
    expect(studentCompleteness(c, 's1', ctx, 1).complete).toBe(true);
    expect(studentCompleteness(c, 's1', ctx, 'jahr').missing.join(' ')).toMatch(/0 von mindestens 5 angesagten Tests/);
  });
});
