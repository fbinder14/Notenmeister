import { describe, expect, it } from 'vitest';
import { emptyCore } from '../src/lib/domain/defaults';
import { nextAssessmentTitle, planningHints, upcomingAppointments } from '../src/lib/domain/schedule';
import type { Assessment, Course, SchoolClass, SchoolYear } from '../src/lib/domain/types';

const year: SchoolYear = { id: 'y', name: '2026/27', start: '2026-09-15', halfSwitch: '2027-02-13', end: '2027-07-30' };
const core = emptyCore();
core.subjects = [
  { id: 'bwr', name: 'BwR', short: 'BwR', color: 'indigo' },
  { id: 'm', name: 'Mathematik', short: 'M', color: 'sky' },
];
const type = (kind: string) => core.types.find((t) => t.kind === kind)!;
const a = (id: string, kind: string, date: string): Assessment => ({ id, typeId: `typ-${kind}`, title: id, date, weight: null, maxPoints: null, gradeKeyId: null, createdAt: '2026-09-20T08:00:00Z' });
const course = (id: string, subjectId: string, assessments: Assessment[], over: Partial<Course> = {}): Course => ({
  id, subjectId, weeklyHours: 3, promotionSubject: true, plannedSchulaufgaben: 2, testModel: false, excludedStudentIds: [], assessments, grades: [], reportGrades: [], ...over,
});
const cls = (courses: Course[]): SchoolClass => ({ v: 1, id: 'k', yearId: 'y', name: '8b', gradeLevel: 8, wpf: '', students: [], courses, createdAt: '2026-09-01T00:00:00Z' });

const today = '2026-11-18';
const texts = (h: { text: string }[]) => h.map((x) => x.text).join(' | ');

describe('Termine', () => {
  it('listet anstehende Leistungsnachweise chronologisch', () => {
    const k = cls([course('c1', 'bwr', [a('alt', 'schulaufgabe', '2026-11-10'), a('sa', 'schulaufgabe', '2026-12-03'), a('ka', 'kurzarbeit', '2026-11-18')])]);
    expect(upcomingAppointments([k], today).map((x) => [x.assessment.id, x.days])).toEqual([
      ['ka', 0],
      ['sa', 15],
    ]);
  });

  it('erkennt einen freien Termin ohne Hinweise', () => {
    const c = course('c1', 'bwr', []);
    expect(planningHints(cls([c]), c, type('schulaufgabe'), '2026-12-03', core, year, today)).toEqual([]);
  });

  it('mahnt den Vorlauf für angekündigte Leistungsnachweise an', () => {
    const c = course('c1', 'bwr', []);
    expect(texts(planningHints(cls([c]), c, type('kurzarbeit'), '2026-11-20', core, year, today))).toContain('nur 2 Tage');
    expect(planningHints(cls([c]), c, type('stegreifaufgabe'), '2026-11-20', core, year, today)).toEqual([]);
  });

  it('findet Konflikte am selben Tag über alle Kurse der Klasse', () => {
    const bwr = course('c1', 'bwr', []);
    const m = course('c2', 'm', [a('saM', 'schulaufgabe', '2026-12-03')]);
    const k = cls([bwr, m]);
    expect(texts(planningHints(k, bwr, type('schulaufgabe'), '2026-12-03', core, year, today))).toContain('SA M');
    expect(texts(planningHints(k, bwr, type('stegreifaufgabe'), '2026-12-03', core, year, today))).toContain('keine Stegreifaufgabe');
  });

  it('meldet zu viele Termine in einer Woche und zu viele Schulaufgaben', () => {
    const c = course('c1', 'bwr', [a('s1', 'schulaufgabe', '2026-10-10'), a('s2', 'schulaufgabe', '2026-11-30'), a('k1', 'kurzarbeit', '2026-12-01')]);
    const m = course('c2', 'm', [a('k2', 'kurzarbeit', '2026-12-02')]);
    const h = texts(planningHints(cls([c, m]), c, type('schulaufgabe'), '2026-12-04', core, year, today));
    expect(h).toContain('4 angekündigte Leistungsnachweise in KW49');
    expect(h).toContain('das wäre die 3.');
  });

  it('warnt bei Daten außerhalb des Schuljahres und schlägt Titel vor', () => {
    const c = course('c1', 'bwr', [a('s1', 'schulaufgabe', '2026-10-10')]);
    expect(texts(planningHints(cls([c]), c, type('kurzarbeit'), '2027-09-01', core, year, today))).toContain('außerhalb des Schuljahres');
    expect(nextAssessmentTitle(c, type('schulaufgabe'))).toBe('2. Schulaufgabe');
    expect(nextAssessmentTitle(c, type('angesagter_test'))).toBe('1. Angesagter Test');
  });
});
