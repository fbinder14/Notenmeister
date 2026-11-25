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
      rounding: 'mild',
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
  { name: 'Politik und Gesellschaft', short: 'PuG' },
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
  const pick = (row: Array<number | null>) => row[i];
  // Ohne Wahlpflichtfächergruppe nur, wenn Gruppe I und die übrigen Gruppen übereinstimmen.
  const byGroup = (g1Row: Array<number | null>, otherRow: Array<number | null>) => {
    if (wpf) return pick(wpf === 'I' ? g1Row : otherRow);
    return pick(g1Row) === pick(otherRow) ? pick(g1Row) : null;
  };
  if (n.startsWith('deutsch') || n.startsWith('englisch')) return pick([4, 4, 4, 4, 3, 3]);
  if (n.startsWith('mathe')) return byGroup([4, 4, 4, 4, 4, 3], [4, 4, 3, 3, 3, 3]);
  if (n.startsWith('physik')) return byGroup([null, null, 2, 2, 3, 3], [null, null, null, 2, 2, 2]);
  if (n.startsWith('chemie')) return byGroup([null, null, null, 2, 2, 2], [null, null, null, null, 2, 2]);
  if (n.startsWith('betriebswirtschaft') || n === 'bwr') return wpf === 'II' ? pick([null, null, 3, 3, 3, 3]) : null;
  if (n.startsWith('französisch')) return wpf === 'IIIa' ? pick([null, null, 3, 3, 3, 3]) : null;
  if (['kunst', 'werken', 'ernährung und gesundheit', 'sozialwesen'].some((s) => n.startsWith(s))) {
    return wpf === 'IIIb' ? pick([null, null, 3, 3, 3, 3]) : null;
  }
  return null;
}

// ---------- Stundentafel (RSO Anlage 1, Fassung gültig ab 01.08.2026) ----------

type Row = [number | null, number | null, number | null, number | null, number | null, number | null];
type Group = Exclude<WpfGroup, ''>;

/** Wochenstunden je Jahrgangsstufe 5–10; null = Fach in dieser Stufe nicht vorgesehen. */
const SAME = {
  religion: [2, 2, 2, 2, 2, 2],
  deutsch: [5, 5, 4, 4, 4, 4],
  englisch: [5, 4, 4, 4, 3, 4],
  geschichte: [null, 2, 2, 2, 2, 2],
  geographie: [2, 2, 2, 2, 2, null],
  politik: [null, null, null, null, null, 2],
  biologie: [2, 2, 2, 2, null, 2],
  // Basissportunterricht; bis zu zwei weitere Stunden möglich (Fußnote 9).
  sport: [2, 2, 2, 2, 2, 2],
} satisfies Record<string, Row>;

const MATHE_SPRACHE: Row = [5, 5, 3, 3, 3, 4];

const STUNDENTAFEL: Record<Group, Record<string, Row>> = {
  I: {
    ...SAME,
    wr: [null, null, null, null, 2, null],
    mathematik: [5, 5, 4, 4, 5, 5],
    physik: [null, null, 2, 2, 3, 3],
    chemie: [null, null, null, 2, 2, 2],
    gestaltung: [3, 2, 1, 1, 1, null],
    musik: [2, 2, 1, 1, 1, null],
    ernaehrung: [null, null, 2, null, null, null],
  },
  II: {
    ...SAME,
    mathematik: MATHE_SPRACHE,
    physik: [null, null, null, 2, 2, 2],
    chemie: [null, null, null, null, 2, 2],
    bwr: [null, null, 3, 3, 3, 3],
    wr: [null, null, null, 2, 2, null],
    gestaltung: [3, 2, 1, 1, 1, null],
    musik: [2, 2, 1, 1, 1, null],
    ernaehrung: [null, null, 2, null, null, null],
  },
  IIIa: {
    ...SAME,
    franzoesisch: [null, null, 4, 3, 4, 4],
    bwr: [null, null, 2, 2, null, null],
    wr: [null, null, null, null, 2, null],
    mathematik: MATHE_SPRACHE,
    physik: [null, null, null, 2, 2, 2],
    chemie: [null, null, null, null, 2, 2],
    gestaltung: [3, 2, 1, null, null, null],
    musik: [2, 2, 1, 1, 1, null],
  },
  IIIb: {
    ...SAME,
    wr: [null, null, null, null, 2, null],
    mathematik: MATHE_SPRACHE,
    physik: [null, null, null, 2, 2, 2],
    chemie: [null, null, null, null, 2, 2],
    // Wahlpflichtfach (Kunst, Werken, Ernährung und Gesundheit oder Sozialwesen), Fußnote 7.
    wahlpflichtfach: [null, null, 3, 3, 3, 3],
    gestaltung: [3, 2, 1, 1, 1, null],
    musik: [2, 2, 1, 1, 1, 1],
    ernaehrung: [null, null, 2, null, null, null],
  },
};

/** Ordnet einen Fachnamen einer Zeile der Stundentafel zu. */
function stundentafelRow(name: string, group: Group, i: number): string | null {
  const n = name.toLowerCase().trim();
  const has = (...p: string[]) => p.some((x) => n.startsWith(x));
  if (has('religion', 'evangelisch', 'katholisch', 'ethik', 'kath.', 'ev.')) return 'religion';
  if (has('deutsch')) return 'deutsch';
  if (has('englisch')) return 'englisch';
  if (has('französisch', 'franzoesisch')) return 'franzoesisch';
  if (has('geschichte')) return 'geschichte';
  if (has('geographie', 'erdkunde')) return 'geographie';
  if (has('politik')) return 'politik';
  if (has('biologie')) return 'biologie';
  if (has('sport')) return 'sport';
  if (has('mathe')) return 'mathematik';
  if (has('physik')) return 'physik';
  if (has('chemie')) return 'chemie';
  if (has('betriebswirtschaft') || n === 'bwr') return 'bwr';
  if (has('wirtschaft und recht') || n === 'wr') return 'wr';
  if (has('musik')) return 'musik';
  // In IIIb ab Jahrgangsstufe 7 sind diese Fächer in der Regel das Wahlpflichtfach.
  if (group === 'IIIb' && i >= 2 && has('kunst', 'werken', 'ernährung', 'sozialwesen')) return 'wahlpflichtfach';
  if (has('ernährung')) return 'ernaehrung';
  if (has('kunst', 'werken', 'technisches zeichnen', 'gestaltung')) return 'gestaltung';
  return null;
}

/**
 * Wochenstunden laut Stundentafel (RSO Anlage 1). Ohne Wahlpflichtfächergruppe nur,
 * wenn alle Gruppen übereinstimmen. Liefert null bei unbekanntem Fach, flexibel
 * verteilten Stunden (Informationstechnologie) oder wenn das Fach nicht vorgesehen ist.
 */
export function weeklyHoursFor(subjectName: string, gradeLevel: number, wpf: WpfGroup): number | null {
  const i = gradeLevel - 5;
  if (i < 0 || i > 5) return null;
  const groups: Group[] = wpf ? [wpf] : ['I', 'II', 'IIIa', 'IIIb'];
  const values = groups.map((g) => {
    const row = stundentafelRow(subjectName, g, i);
    return row ? (STUNDENTAFEL[g][row]?.[i] ?? null) : null;
  });
  return values.every((v) => v !== null && v === values[0]) ? values[0] : null;
}
