import { describe, expect, it } from 'vitest';
import { defaultTypes } from '../src/lib/domain/defaults';
import type { Ctx } from '../src/lib/domain/grading';
import {
  atRisk,
  backupAge,
  daysBetween,
  gapLabel,
  openMakeups,
  pendingGrading,
  relativeDays,
  reportStatus,
  yearProgress,
} from '../src/lib/domain/dashboard';
import type { Assessment, Course, Grade, GradeStatus, GradeValue, SchoolClass, SchoolYear } from '../src/lib/domain/types';

const year: SchoolYear = { id: 'y', name: '2026/27', start: '2026-09-15', halfSwitch: '2027-02-13', end: '2027-07-30' };
const ctx: Ctx = { types: new Map(defaultTypes().map((t) => [t.id, t])), year };

let n = 0;
const grade = (studentId: string, value: GradeValue | null, opts: Partial<Grade> = {}): Grade => ({
  id: `g${++n}`, studentId, assessmentId: null, typeId: 'typ-unterrichtsbeitrag', weight: null, title: '', value, points: null,
  status: 'gewertet' as GradeStatus, comment: '', performedAt: '2026-10-01T09:00:00.000Z', recordedAt: '2026-10-01T09:00:00.000Z', history: [], ...opts,
});
const assessment = (id: string, date: string, typeId = 'typ-stegreifaufgabe'): Assessment => ({ id, typeId, title: id, date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: `${date}T08:00:00Z` });
const course = (over: Partial<Course> = {}): Course => ({
  id: 'c1', subjectId: 'sub', weeklyHours: 3, promotionSubject: true, plannedSchulaufgaben: 0, testModel: false,
  excludedStudentIds: [], assessments: [], grades: [], reportGrades: [], ...over,
});
const cls = (courses: Course[]): SchoolClass => ({
  v: 1, id: 'k', yearId: 'y', name: '8b', gradeLevel: 8, wpf: '', createdAt: '2026-09-01T00:00:00Z', courses,
  students: [
    { id: 'a', lastName: 'A', firstName: 'Anna' },
    { id: 'b', lastName: 'B', firstName: 'Ben' },
    { id: 'x', lastName: 'X', firstName: 'Xaver', leftAt: '2026-10-01' },
  ],
});

describe('Startseite', () => {
  it('rechnet Tage und beschreibt sie', () => {
    expect(daysBetween('2026-11-18', '2026-11-21')).toBe(3);
    expect(relativeDays(0)).toBe('heute');
    expect(relativeDays(1)).toBe('morgen');
    expect(relativeDays(4)).toBe('in 4 Tagen');
    expect(relativeDays(-2)).toBe('vor 2 Tagen');
  });

  it('findet vergangene Leistungsnachweise mit fehlenden Noten', () => {
    const c = course({
      assessments: [assessment('ex1', '2026-11-10'), assessment('ex2', '2026-11-12'), assessment('zukunft', '2026-11-30')],
      grades: [
        grade('a', 2, { assessmentId: 'ex1' }),
        grade('b', null, { assessmentId: 'ex1', status: 'nachtermin' }),
        grade('a', 3, { assessmentId: 'ex2' }),
      ],
    });
    const p = pendingGrading([cls([c])], '2026-11-18');
    expect(p.map((x) => [x.assessment.id, x.entered, x.total, x.age])).toEqual([['ex2', 1, 2, 6]]);
  });

  it('sammelt offene Nachtermine und fehlende Ersatznoten', () => {
    const c = course({
      assessments: [assessment('ex1', '2026-11-10'), assessment('ex2', '2026-11-12')],
      grades: [
        grade('a', null, { assessmentId: 'ex1', status: 'nachtermin' }),
        grade('b', null, { assessmentId: 'ex2', status: 'nicht_gewertet' }),
        grade('x', null, { assessmentId: 'ex2', status: 'nachtermin' }), // ausgetreten
      ],
    });
    const m = openMakeups([cls([c])], '2026-11-18');
    expect(m.map((x) => [x.student.id, x.kind, x.age])).toEqual([
      ['a', 'nachtermin', 8],
      ['b', 'ersatz', 6],
    ]);
    c.grades.push(grade('b', 3, { typeId: 'typ-rechenschaftsablage', replacesAssessmentId: 'ex2' }));
    expect(openMakeups([cls([c])], '2026-11-18').map((x) => x.student.id)).toEqual(['a']);
  });

  it('meldet gefährdete Schnitte und zu wenige Noten erst ab der Hälfte des Halbjahres', () => {
    const c = course({ grades: [grade('a', 5), grade('a', 4), grade('b', 2), grade('b', 2, { performedAt: '2026-10-02T09:00:00Z' })] });
    const early = atRisk([cls([c])], ctx, '2026-10-20');
    expect(early.map((r) => [r.student.id, r.reasons])).toEqual([['a', ['schnitt']]]);
    const late = atRisk([cls([c])], ctx, '2027-01-10');
    expect(late.map((r) => [r.student.id, r.reasons])).toEqual([['a', ['schnitt']]]);
    const c2 = course({ grades: [grade('a', 5), grade('a', 4), grade('b', 2)] });
    expect(atRisk([cls([c2])], ctx, '2027-01-10').map((r) => [r.student.id, r.reasons])).toEqual([
      ['a', ['schnitt']],
      ['b', ['wenige']],
    ]);
  });

  it('zeigt den Fortschritt im Schuljahr', () => {
    const p = yearProgress(year, '2027-02-12');
    expect(p.half).toBe(1);
    expect(p.daysLeftInHalf).toBe(0);
    expect(p.switchAt).toBeGreaterThan(0.4);
    expect(yearProgress(year, '2027-02-13').half).toBe(2);
    expect(yearProgress(year, '2026-09-01').before).toBe(true);
  });

  it('fasst den Stand vor dem nächsten Zeugnis je Kurs zusammen', () => {
    const c = course({ plannedSchulaufgaben: 2, grades: [grade('a', 2), grade('a', 3, { typeId: 'typ-rechenschaftsablage' }), grade('b', 2)] });
    const r = reportStatus([cls([c])], ctx, '2026-11-18')!;
    expect(r.term).toBe('zwischen');
    expect(r.date).toBe('2027-02-13');
    expect(r.courses[0].total).toBe(2);
    expect(r.courses[0].missing.length).toBeGreaterThan(0);
    expect(reportStatus([cls([c])], ctx, '2027-08-01')).toBeNull();
    expect(reportStatus([cls([c])], ctx, '2027-03-01')!.term).toBe('jahr');
  });

  it('kürzt Lücken auf eine Bezeichnung', () => {
    expect(gapLabel('1. Hj.: 1 von 2 kleinen Leistungsnachweisen')).toEqual({ text: 'kleine Noten fehlen', courseWide: false });
    expect(gapLabel('1 von 3 Schulaufgaben').courseWide).toBe(true);
  });

  it('berechnet das Alter der letzten Sicherung', () => {
    expect(backupAge(null)).toBeNull();
    expect(backupAge(new Date('2026-11-10T10:00:00Z'), new Date('2026-11-18T09:00:00Z'))).toBe(7);
  });
});
