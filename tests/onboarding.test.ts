import { describe, expect, it } from 'vitest';
import { bavarianYear } from '../src/lib/domain/calendar';
import { defaultTypes } from '../src/lib/domain/defaults';
import { courseWarnings } from '../src/lib/domain/rules';
import { emptyCore } from '../src/lib/domain/defaults';
import {
  courseDefaults,
  courseRemovable,
  demoClass,
  demoUntouched,
  gettingStarted,
  gradeLevelOf,
  needsOnboarding,
  parseClassNames,
  stepIndex,
  STEPS,
  suggestShort,
} from '../src/lib/domain/onboarding';
import type { SchoolYear } from '../src/lib/domain/types';

describe('Zustand des Assistenten', () => {
  it('öffnet sich nur für neu eingerichtete Tresore', () => {
    expect(needsOnboarding({})).toBe(false); // Datenstand von vor dem Assistenten
    expect(needsOnboarding({ onboarding: { step: 'faecher' } })).toBe(true);
    expect(needsOnboarding({ onboarding: { step: 'klassen', doneAt: '2026-11-25T10:00:00Z' } })).toBe(false);
  });

  it('führt die Schritte in fester Reihenfolge', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['faecher', 'schuljahr', 'klassen', 'unterricht', 'sicherung', 'fertig']);
    expect(stepIndex('unterricht')).toBe(3);
  });
});

describe('Eingaben erkennen', () => {
  it('zerlegt mehrere Klassen und erkennt die Jahrgangsstufe', () => {
    expect(parseClassNames('7a, 8b 9c;10 d\n8b')).toEqual([
      { name: '7a', gradeLevel: 7 },
      { name: '8b', gradeLevel: 8 },
      { name: '9c', gradeLevel: 9 },
      { name: '10 d', gradeLevel: 10 },
    ]);
    expect(gradeLevelOf('Q11')).toBeNull();
    expect(gradeLevelOf('4a')).toBeNull();
    expect(gradeLevelOf('6M1')).toBe(6);
  });

  it('schlägt Kürzel für eigene Fächer vor', () => {
    expect(suggestShort('Mathematik')).toBe('M');
    expect(suggestShort('ethik')).toBe('Eth');
    expect(suggestShort('Darstellendes Spiel')).toBe('DS');
    expect(suggestShort('Latein')).toBe('Lat');
  });

  it('belegt Unterricht nach Stundentafel und RSO vor', () => {
    expect(courseDefaults('Betriebswirtschaftslehre/Rechnungswesen', 8, 'II')).toEqual({ weeklyHours: 3, plannedSchulaufgaben: 3, hoursFromRso: true, saFromRso: true });
    expect(courseDefaults('Mathematik', 5, '')).toMatchObject({ weeklyHours: 5, plannedSchulaufgaben: 4 });
    expect(courseDefaults('Informationstechnologie', 8, 'I')).toMatchObject({ hoursFromRso: false, saFromRso: false });
  });
});

describe('Erste Schritte und Beispielklasse', () => {
  const year: SchoolYear = { id: 'y', ...bavarianYear(2026)! };
  const today = '2026-11-25';
  const demo = demoClass(year, { id: 'bwr', name: 'Betriebswirtschaftslehre/Rechnungswesen' }, today);

  it('legt eine glaubwürdige Beispielklasse an', () => {
    expect(demo.demo).toBe(true);
    expect(demo.students).toHaveLength(12);
    const [c] = demo.courses;
    expect(c.assessments.map((a) => a.title)).toEqual(['1. Schulaufgabe', '1. Stegreifaufgabe', '1. Kurzarbeit']);
    expect(c.assessments[2].date > today).toBe(true);
    for (const a of c.assessments) expect([0, 6]).not.toContain(new Date(`${a.date}T12:00:00Z`).getUTCDay());
    expect(c.grades.filter((g) => g.assessmentId === c.assessments[0].id)).toHaveLength(12);
    expect(demoUntouched(demo)).toBe(true);
    expect(courseRemovable(c)).toBe(false);
  });

  it('löst keine roten Hinweise aus', () => {
    const core = emptyCore();
    core.types = defaultTypes();
    core.subjects = [{ id: 'bwr', name: 'BwR', short: 'BwR', color: 'indigo' }];
    expect(courseWarnings(demo, demo.courses[0], core, year, today).filter((w) => w.severity === 'warn')).toEqual([]);
  });

  it('zählt die Beispielklasse bei den ersten Schritten nicht mit', () => {
    expect(gettingStarted([demo], false).every((i) => !i.done)).toBe(true);
    const real = { ...demo, demo: undefined, courses: [] };
    const items = gettingStarted([real], true);
    expect(items.filter((i) => i.done).map((i) => i.id)).toEqual(['klasse', 'schueler', 'sicherung']);
  });
});
