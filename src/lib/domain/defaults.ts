import { randomId } from '../crypto/encoding';
import type { AssessmentType, Core, GradeKey, SchoolYear, Subject, WpfGroup } from './types';

/** Vorbelegung nach RSO §§ 17–19, 23 (Fassung gültig ab 01.08.2026). */
export function defaultTypes(): AssessmentType[] {
  const t = (
    kind: AssessmentType['kind'],
    name: string,
    short: string,
    category: AssessmentType['category'],
    mode: AssessmentType['mode'],
    weight: number,
    announced: boolean,
    countsForDayLimit: boolean,
  ): AssessmentType => ({
    id: `typ-${kind}`,
    kind,
    name,
    short,
    category,
    mode,
    weight,
    announced,
    countsForDayLimit,
    builtin: true,
  });
  return [
    t('schulaufgabe', 'Schulaufgabe', 'SA', 'gross', 'schriftlich', 2, true, true),
    t('angesagter_test', 'Angesagter Test (§ 18 Abs. 3)', 'T', 'gross', 'schriftlich', 2, true, true),
    t('ersatz_schulaufgabe', 'Ersatz für Schulaufgabe', 'SA*', 'gross', 'schriftlich', 2, true, false),
    t('kurzarbeit', 'Kurzarbeit', 'KA', 'klein', 'schriftlich', 1, true, true),
    t('stegreifaufgabe', 'Stegreifaufgabe', 'Ex', 'klein', 'schriftlich', 1, false, false),
    t('leistungstest', 'Fachlicher Leistungstest', 'LT', 'klein', 'schriftlich', 1, true, true),
    t('rechenschaftsablage', 'Rechenschaftsablage', 'RA', 'klein', 'muendlich', 1, false, false),
    t('referat', 'Referat', 'Ref', 'klein', 'muendlich', 1, false, false),
    t('unterrichtsbeitrag', 'Unterrichtsbeitrag', 'UB', 'klein', 'muendlich', 1, false, false),
    t('praktisch', 'Praktischer Leistungsnachweis', 'Pr', 'klein', 'praktisch', 1, false, false),
    t('gleichwertig', 'Gleichwertiges Prüfungsformat', 'GP', 'klein', 'schriftlich', 1, false, false),
  ];
}

export function defaultGradeKeys(): GradeKey[] {
  return [
    { id: 'key-standard', name: 'Standard', thresholds: [92, 81, 67, 50, 30], step: 0.5 },
    { id: 'key-linear', name: 'Linear', thresholds: [85, 70, 55, 40, 20], step: 0.5 },
    { id: 'key-streng', name: 'Streng', thresholds: [95, 85, 70, 55, 35], step: 0.5 },
  ];
}

export const SUBJECT_COLORS = ['indigo', 'sky', 'emerald', 'amber', 'rose', 'violet', 'teal', 'orange', 'slate'] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

/** Schuljahr nach bayerischem Muster: Beginn Mitte September, Halbjahr Mitte Februar, Ende Ende Juli. */
export function suggestYear(today = new Date()): SchoolYear {
  const y = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    id: randomId(),
    name: `${y}/${String((y + 1) % 100).padStart(2, '0')}`,
    start: `${y}-09-15`,
    halfSwitch: `${y + 1}-02-14`,
    end: `${y + 1}-07-31`,
  };
}

export function emptyCore(): Core {
  return {
    v: 1,
    settings: {
      autoLockMinutes: 10,
      rounding: 'streng',
      theme: 'system',
      activeYearId: null,
      defaultGradeKeyId: 'key-standard',
    },
    years: [],
    subjects: [],
    types: defaultTypes(),
    gradeKeys: defaultGradeKeys(),
  };
}

export const SUBJECT_SUGGESTIONS: Array<Pick<Subject, 'name' | 'short'>> = [
  { name: 'Deutsch', short: 'D' },
  { name: 'Englisch', short: 'E' },
  { name: 'Mathematik', short: 'M' },
  { name: 'Betriebswirtschaftslehre/Rechnungswesen', short: 'BwR' },
  { name: 'Wirtschaft und Recht', short: 'WR' },
  { name: 'Französisch', short: 'F' },
  { name: 'Physik', short: 'Ph' },
  { name: 'Chemie', short: 'C' },
  { name: 'Biologie', short: 'B' },
  { name: 'Geschichte', short: 'G' },
  { name: 'Geographie', short: 'Geo' },
  { name: 'Informationstechnologie', short: 'IT' },
  { name: 'Kunst', short: 'Ku' },
  { name: 'Musik', short: 'Mu' },
  { name: 'Sport', short: 'Sp' },
];

/**
 * Anzahl der Schulaufgaben nach RSO § 18 Abs. 1. Liefert null, wenn das Fach
 * nicht in der Tabelle steht oder die Gruppe nicht passt.
 */
export function plannedSchulaufgabenFor(subjectName: string, gradeLevel: number, wpf: WpfGroup): number | null {
  const i = gradeLevel - 5;
  if (i < 0 || i > 5) return null;
  const n = subjectName.toLowerCase();
  const g1 = wpf === 'I';
  const g3 = wpf === 'IIIa' || wpf === 'IIIb';
  const pick = (row: Array<number | null>) => row[i];
  if (n.startsWith('deutsch') || n.startsWith('englisch')) return pick([4, 4, 4, 4, 3, 3]);
  if (n.startsWith('mathe')) {
    if (!wpf) return null;
    return pick(g1 ? [4, 4, 4, 4, 4, 3] : [4, 4, 3, 3, 3, 3]);
  }
  if (n.startsWith('physik')) {
    if (!wpf) return null;
    return pick(g1 ? [null, null, 2, 2, 3, 3] : [null, null, null, 2, 2, 2]);
  }
  if (n.startsWith('chemie')) {
    if (!wpf) return null;
    return pick(g1 ? [null, null, null, 2, 2, 2] : [null, null, null, null, 2, 2]);
  }
  if (n.startsWith('betriebswirtschaft') || n === 'bwr') return wpf === 'II' ? pick([null, null, 3, 3, 3, 3]) : null;
  if (n.startsWith('französisch')) return g3 ? pick([null, null, 3, 3, 3, 3]) : null;
  if (['kunst', 'werken', 'ernährung und gesundheit', 'sozialwesen'].some((s) => n.startsWith(s))) {
    return g3 ? pick([null, null, 3, 3, 3, 3]) : null;
  }
  return null;
}
