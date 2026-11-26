import { suggestGrade } from './grading';
import { DISCIPLINES, isbThresholds, type Discipline } from './sportTables';
import type {
  AssessmentType,
  Course,
  GradeValue,
  Rounding,
  SportField,
  SportGroup,
  SportPart,
  SportPartMeasure,
  SportPartResult,
  SportResult,
  SportSpec,
  SportThresholds,
  SportUnit,
  Subject,
} from './types';

/** Sport: reine Logik ohne Oberfläche (Fachprofil, Notenarten, Messwerte, Teilnoten). */

// ---------- Fachprofil ----------

export const isSportName = (name: string) => name.trim().toLowerCase().startsWith('sport');

/** Wertungstabelle aus dem Fachnamen, z. B. „Sport (Mädchen)“ → w. */
export function sportGroupFromName(name: string): SportGroup | undefined {
  if (!isSportName(name)) return undefined;
  const n = name.toLowerCase();
  if (/mädchen|maedchen|weiblich|damen|\(w\)/.test(n)) return 'w';
  if (/jungen|buben|männlich|maennlich|herren|\(m\)/.test(n)) return 'm';
  return undefined;
}

export function isSportSubject(s: Pick<Subject, 'name' | 'sport'> | undefined): boolean {
  return !!s && (s.sport !== undefined || isSportName(s.name));
}

export function isSportCourse(course: Pick<Course, 'subjectId'>, subjects: Subject[]): boolean {
  return isSportSubject(subjects.find((s) => s.id === course.subjectId));
}

export const SPORT_GROUP_LABEL: Record<SportGroup, string> = { m: 'Jungen', w: 'Mädchen' };

/** Handlungsfelder nach LehrplanPLUS Sport (Realschule), Lernbereich 4 sowie Gesundheit und Fitness. */
export const SPORT_FIELDS: Record<SportField, string> = {
  leichtathletik: 'Leichtathletik',
  schwimmen: 'Schwimmen',
  spiele: 'Sportspiele',
  turnen: 'Turnen und Bewegungskünste',
  gymnastik: 'Gymnastik und Tanz',
  fitness: 'Gesundheit und Fitness',
  sonstiges: 'Sonstiges',
};

// ---------- Notenarten ----------

export type TypePurpose = 'assessment' | 'single' | 'quick';

/** Arten, die bei einem Kurs angeboten werden: im Sport die Sport-Arten, sonst die übrigen. */
export function typesFor(types: AssessmentType[], sport: boolean, purpose: TypePurpose): AssessmentType[] {
  const list = types.filter((t) => {
    if (t.archived) return false;
    if (sport) {
      // Im Sport keine schriftlichen Arten und keine allgemeinen praktischen/mündlichen Vorgaben.
      if (!(t.scope === 'sport' || t.kind === 'eigene' || t.kind === 'gleichwertig')) return false;
    } else if (t.scope === 'sport') return false;
    if (purpose === 'quick') return t.category === 'klein';
    if (purpose === 'assessment' && !sport) {
      return t.mode === 'schriftlich' || t.kind === 'praktisch' || t.kind === 'referat' || t.kind === 'gleichwertig';
    }
    return true;
  });
  // Im Sport die Sport-Arten zuerst.
  return sport ? [...list.filter((t) => t.scope === 'sport'), ...list.filter((t) => t.scope !== 'sport')] : list;
}

/** Vorausgewählte Art: im Sport der sportpraktische Nachweis, sonst Schulaufgabe bzw. Rechenschaftsablage. */
export function preferredTypeId(
  available: AssessmentType[],
  course: Pick<Course, 'testModel'>,
  sport: boolean,
  purpose: TypePurpose | 'observation',
): string {
  const want =
    purpose === 'observation'
      ? sport
        ? 'typ-sport_einsatz'
        : 'typ-unterrichtsbeitrag'
      : sport
        ? 'typ-sport_praktisch'
        : purpose === 'assessment'
          ? course.testModel
            ? 'typ-angesagter_test'
            : 'typ-schulaufgabe'
          : 'typ-rechenschaftsablage';
  return available.some((t) => t.id === want) ? want : (available[0]?.id ?? want);
}

// ---------- Messwerte ----------

export const UNIT_LABEL: Record<SportUnit, string> = { s: 'Zeit', m: 'Meter', n: 'Anzahl' };
export const UNIT_HINT: Record<SportUnit, string> = { s: 'z. B. 8,4 oder 3:45', m: 'z. B. 4,35', n: 'z. B. 42' };
/** Kurzer Platzhalter für Eingabefelder. */
export const UNIT_PLACEHOLDER: Record<SportUnit, string> = { s: 's', m: 'm', n: 'Anz.' };

/** Liest eine Eingabe: Zeiten als „8,4“, „3:45“ oder „3:45,2“; Weiten als „4,35“. */
export function parseMeasure(text: string, unit: SportUnit): number | null {
  const raw = text.trim().replace(/\s+/g, '').replace(/,/g, '.');
  if (!raw) return null;
  if (unit === 's' && raw.includes(':')) {
    const m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(raw);
    if (!m || Number(m[2]) >= 60) return null;
    return round(Number(m[1]) * 60 + Number(m[2]));
  }
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? round(v) : null;
}

const round = (v: number) => Math.round(v * 1000) / 1000;
const comma = (v: number, digits: number) => (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, '').replace('.', ',');

/** Anzeige eines Messwerts: Zeiten ab einer Minute als m:ss,z, sonst mit Komma. */
export function formatMeasure(v: number | null | undefined, unit: SportUnit): string {
  if (v == null) return '';
  if (unit === 's' && v >= 60) {
    const min = Math.floor(v / 60);
    const sec = round(v - min * 60);
    const [whole, frac] = comma(sec, 2).split(',');
    return `${min}:${whole.padStart(2, '0')}${frac ? `,${frac}` : ''}`;
  }
  if (unit === 'm') return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  return comma(v, 2);
}

export function unitSuffix(unit: SportUnit, v?: number | null): string {
  if (unit === 's') return v != null && v >= 60 ? 'min' : 's';
  if (unit === 'm') return 'm';
  return '';
}

/** Bester Versuch: kleinster Wert bei Zeiten, größter bei Weiten, Höhen und Anzahl. */
export function bestOf(values: Array<number | null | undefined> | undefined, better: 'low' | 'high'): number | null {
  const v = (values ?? []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return null;
  return better === 'low' ? Math.min(...v) : Math.max(...v);
}

/**
 * Note aus einem Messwert. Die Grenzen gelten einschließlich („ab“): bei Zeiten
 * ergibt eine Zeit bis einschließlich der ersten Grenze die Note 1, bei Weiten
 * ein Wert ab einschließlich der ersten Grenze. Schlechter als die fünfte: Note 6.
 */
export function gradeFromMeasure(v: number, thresholds: SportThresholds, better: 'low' | 'high'): GradeValue {
  const eps = 1e-9;
  for (let i = 0; i < 5; i++) {
    if (better === 'low' ? v <= thresholds[i] + eps : v >= thresholds[i] - eps) return (i + 1) as GradeValue;
  }
  return 6;
}

/** Notenbereiche zur Anzeige, z. B. „bis 7,9“ oder „ab 4,10“. */
export function measureRanges(part: Pick<SportPartMeasure, 'thresholds' | 'better' | 'unit'>): Array<{ grade: GradeValue; text: string }> {
  const t = part.thresholds;
  const f = (v: number) => formatMeasure(v, part.unit);
  const out: Array<{ grade: GradeValue; text: string }> = t.map((v, i) => ({ grade: (i + 1) as GradeValue, text: `${part.better === 'low' ? 'bis' : 'ab'} ${f(v)}` }));
  out.push({ grade: 6, text: part.better === 'low' ? `über ${f(t[4])}` : `unter ${f(t[4])}` });
  return out;
}

/** Ob die Grenzen in sich stimmig sind (streng monoton in Richtung „schlechter“). */
export function validThresholds(t: SportThresholds, better: 'low' | 'high'): boolean {
  if (t.some((v) => !Number.isFinite(v) || v < 0)) return false;
  for (let i = 1; i < 5; i++) if (better === 'low' ? t[i] <= t[i - 1] : t[i] >= t[i - 1]) return false;
  return true;
}

// ---------- Leistungsfortschritt (ISB 2023) ----------

/** Verbesserung in Prozent bezogen auf den Eingangstest (positiv = besser geworden). */
export function improvementPercent(entry: number, exit: number, better: 'low' | 'high'): number {
  if (entry <= 0) return 0;
  return ((better === 'low' ? entry - exit : exit - entry) / entry) * 100;
}

/** Mindest-Steigerung in Prozent für die Verbesserungsnoten 1 bis 5 (ISB 2023, S. 7). */
export const PROGRESS_STEPS: SportThresholds = [5, 4, 3, 2, 1];

/** Verbesserungsnote; unter 1 % ist keine vorgesehen (null). */
export function improvementGrade(percent: number): GradeValue | null {
  for (let i = 0; i < 5; i++) if (percent >= PROGRESS_STEPS[i] - 1e-9) return (i + 1) as GradeValue;
  return null;
}

export interface ProgressDetail {
  entryGrade: GradeValue;
  exitGrade: GradeValue;
  percent: number;
  improvementGrade: GradeValue | null;
  /** Rechnerische Note vor dem Runden. */
  raw: number;
  /** Sonderfall: Gesamtnote auf die bessere Testnote begrenzt. */
  capped: boolean;
}

/**
 * Note für den Leistungsfortschritt nach ISB (2023):
 * (Note Eingangstest + Note Ausgangstest + 3 × Verbesserungsnote) / 5.
 * Sonderfall: Die Gesamtnote kann nicht schlechter sein als die bessere Note von
 * Eingangs- oder Ausgangstest – das gilt auch, wenn keine Verbesserungsnote vorliegt.
 */
export function progressDetail(entry: number, exit: number, part: Pick<SportPartMeasure, 'thresholds' | 'better'>): ProgressDetail {
  const entryGrade = gradeFromMeasure(entry, part.thresholds, part.better);
  const exitGrade = gradeFromMeasure(exit, part.thresholds, part.better);
  const percent = improvementPercent(entry, exit, part.better);
  const ig = improvementGrade(percent);
  const better = Math.min(entryGrade, exitGrade);
  const formula = ig === null ? Infinity : (entryGrade + exitGrade + 3 * ig) / 5;
  const capped = formula > better;
  return { entryGrade, exitGrade, percent, improvementGrade: ig, raw: capped ? better : formula, capped };
}

// ---------- Teile zusammenführen ----------

export interface PartOutcome {
  part: SportPart;
  /** Note des Teils (gerundet) bzw. null, solange Angaben fehlen. */
  grade: GradeValue | null;
  /** Rechnerischer Wert vor dem Runden (für den Schnitt). */
  raw: number | null;
  best: number | null;
  progress?: ProgressDetail;
}

export function partOutcome(part: SportPart, r: SportPartResult | undefined, rounding: Rounding): PartOutcome {
  if (part.kind === 'note') return { part, grade: r?.value ?? null, raw: r?.value ?? null, best: null };
  const best = bestOf(r?.attempts, part.better);
  if (part.kind === 'messung') {
    if (best === null) return { part, grade: null, raw: null, best };
    const g = gradeFromMeasure(best, part.thresholds, part.better);
    return { part, grade: g, raw: g, best };
  }
  const entry = bestOf(r?.entry, part.better);
  if (best === null || entry === null) return { part, grade: null, raw: null, best };
  const progress = progressDetail(entry, best, part);
  return { part, grade: suggestGrade(progress.raw, rounding), raw: progress.raw, best, progress };
}

export interface SportOutcome {
  parts: PartOutcome[];
  /** Gewichteter Schnitt der Teile; null, solange ein Teil fehlt. */
  raw: number | null;
  value: GradeValue | null;
}

/** Note eines Sport-Nachweises aus allen Teilen (gewichteter Schnitt, Rundung wie beim Zeugnis). */
export function sportOutcome(spec: SportSpec, result: SportResult | undefined, rounding: Rounding): SportOutcome {
  const parts = spec.parts.map((p) => partOutcome(p, result?.parts[p.id], rounding));
  let sum = 0;
  let w = 0;
  for (const o of parts) {
    if (o.part.weight <= 0) continue;
    if (o.raw === null) return { parts, raw: null, value: null };
    sum += o.raw * o.part.weight;
    w += o.part.weight;
  }
  const raw = w > 0 ? sum / w : null;
  return { parts, raw, value: suggestGrade(raw, rounding) };
}

/** Ob überhaupt etwas eingetragen ist. */
export function hasSportInput(result: SportResult | undefined): boolean {
  return Object.values(result?.parts ?? {}).some(
    (r) => r.value != null || (r.attempts ?? []).some((v) => v != null) || (r.entry ?? []).some((v) => v != null),
  );
}

// ---------- Vorlagen ----------

export type SportTemplate = 'leistung' | 'technik_leistung' | 'fortschritt' | 'note';

export const SPORT_TEMPLATES: Record<SportTemplate, { name: string; hint: string }> = {
  leistung: { name: 'Messwert', hint: 'Zeit, Weite oder Höhe; Note aus der Wertungstabelle' },
  technik_leistung: { name: 'Technik + Leistung', hint: 'Technik als Note, Leistung als Messwert, je zur Hälfte' },
  fortschritt: { name: 'Leistungsfortschritt', hint: 'Eingangs- und Ausgangstest mit Verbesserungsnote (ISB)' },
  note: { name: 'Bewertung nach Kriterien', hint: 'z. B. Spielfähigkeit oder Turnübung; Noten je Kriterium' },
};

let seq = 0;
const pid = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Messteil zu einer Disziplin (Schwellen aus der ISB-Tabelle, sofern vorhanden). */
export function measurePart(
  d: Discipline | null,
  gradeLevel: number,
  group: SportGroup | undefined,
  kind: 'messung' | 'fortschritt' = 'messung',
): SportPartMeasure {
  const t = d && group ? isbThresholds(d.id, gradeLevel, group) : null;
  const unit = d?.unit ?? 's';
  const better = d?.better ?? 'low';
  return {
    id: pid(),
    kind,
    label: kind === 'fortschritt' ? 'Leistungsfortschritt' : (d?.name ?? 'Leistung'),
    weight: 1,
    discipline: d?.id,
    unit,
    better,
    thresholds: t ?? placeholderThresholds(unit, better),
    attempts: d?.attempts ?? 3,
  };
}

function placeholderThresholds(unit: SportUnit, better: 'low' | 'high'): SportThresholds {
  if (unit === 's') return [8, 8.5, 9, 9.5, 10.5];
  if (unit === 'm') return better === 'high' ? [4, 3.6, 3.2, 2.8, 2.2] : [1, 2, 3, 4, 5];
  return [40, 34, 28, 22, 14];
}

export const notePart = (label: string, weight = 1): SportPart => ({ id: pid(), kind: 'note', label, weight });

export function templateSpec(
  template: SportTemplate,
  field: SportField,
  d: Discipline | null,
  gradeLevel: number,
  group: SportGroup | undefined,
): SportSpec {
  switch (template) {
    case 'leistung':
      return { field, parts: [measurePart(d, gradeLevel, group)] };
    case 'technik_leistung':
      return { field, parts: [notePart('Technik'), measurePart(d, gradeLevel, group)] };
    case 'fortschritt':
      return { field, parts: [measurePart(d, gradeLevel, group, 'fortschritt')] };
    case 'note':
      return { field, parts: field === 'spiele' ? [notePart('Technik'), notePart('Taktik / Spielfähigkeit')] : [notePart('Ausführung')] };
  }
}

/** Disziplinen eines Handlungsfelds (aus den ISB-Tabellen). */
export const disciplinesFor = (field: SportField) => DISCIPLINES.filter((d) => d.field === field);

/** Kurzbeschreibung eines Teilergebnisses für Notenbuch, Schülerseite und Druck. */
export function describeOutcome(o: PartOutcome): string {
  if (o.part.kind === 'note') return o.grade ? `${o.part.label} ${o.grade}` : '';
  const p = o.part;
  if (o.best === null) return '';
  const v = `${formatMeasure(o.best, p.unit)} ${unitSuffix(p.unit, o.best)}`.trim();
  if (o.progress) return `${p.label}: ${v} (${o.progress.percent >= 0 ? '+' : ''}${comma(o.progress.percent, 1)} %)`;
  return `${p.label} ${v}`;
}
