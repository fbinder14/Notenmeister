import { describe, expect, it } from 'vitest';
import { chronological, closedPhases, observationStats, openPhase, starsToGradeHint } from '../src/lib/domain/observation';
import type { Course, Observation, ObservationPhase, Stars } from '../src/lib/domain/types';

const obs = (id: string, at: string, stars: Stars, createdAt = `${at}T10:00:00Z`): Observation => ({ id, at, stars, text: '', createdAt, updatedAt: createdAt });
const phase = (over: Partial<ObservationPhase>): ObservationPhase => ({ id: 'p', studentId: 's1', typeId: 'typ-unterrichtsbeitrag', startedAt: '2026-11-03T08:00:00Z', entries: [], ...over });
const course = (observations: ObservationPhase[]): Course => ({
  id: 'c', subjectId: 'm', weeklyHours: 4, promotionSubject: true, plannedSchulaufgaben: 3, testModel: false,
  excludedStudentIds: [], assessments: [], grades: [], reportGrades: [], observations,
});

describe('Unterrichtsbeobachtung', () => {
  it('berechnet Zeitraum, Anzahl und Durchschnitt', () => {
    const s = observationStats([obs('a', '2026-11-12', 2), obs('b', '2026-11-03', 4), obs('c', '2026-11-17', 4), obs('d', '2026-11-06', 4)]);
    expect(s).toEqual({ count: 4, first: '2026-11-03', last: '2026-11-17', days: 14, avg: 3.5 });
    expect(observationStats([])).toEqual({ count: 0, first: null, last: null, days: 0, avg: null });
  });

  it('gibt eine Orientierung für die Note aus den Sternen', () => {
    expect(starsToGradeHint(5)).toBe('1');
    expect(starsToGradeHint(3.5)).toBe('2–3');
    expect(starsToGradeHint(3.8)).toBe('2');
    expect(starsToGradeHint(1)).toBe('5');
    expect(starsToGradeHint(null)).toBe('');
  });

  it('findet die offene Phase und frühere Phasen je Schüler', () => {
    const open = phase({ id: 'o' });
    const old = phase({ id: 'x', closedAt: '2026-10-20T10:00:00Z' });
    const older = phase({ id: 'y', closedAt: '2026-09-30T10:00:00Z' });
    const other = phase({ id: 'z', studentId: 's2' });
    const c = course([older, open, old, other]);
    expect(openPhase(c, 's1')?.id).toBe('o');
    expect(openPhase(c, 's3')).toBeUndefined();
    expect(closedPhases(c, 's1').map((p) => p.id)).toEqual(['x', 'y']);
    expect(openPhase(course([]), 's1')).toBeUndefined();
  });

  it('sortiert Beobachtungen nach Datum, am selben Tag nach Erfassung', () => {
    const list = chronological([obs('b', '2026-11-06', 3, '2026-11-06T11:00:00Z'), obs('a', '2026-11-06', 3, '2026-11-06T09:00:00Z'), obs('c', '2026-11-03', 3)]);
    expect(list.map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('Beginn der Beobachtung', () => {
  it('nimmt die früheste Beobachtung, wenn sie vor dem Start liegt', async () => {
    const { phaseSince } = await import('../src/lib/domain/observation');
    expect(phaseSince(phase({ startedAt: '2026-11-17T08:00:00Z', entries: [obs('a', '2026-11-03', 4), obs('b', '2026-11-12', 2)] }))).toBe('2026-11-03');
    expect(phaseSince(phase({ startedAt: '2026-11-03T08:00:00Z', entries: [] }))).toBe('2026-11-03');
  });
});
