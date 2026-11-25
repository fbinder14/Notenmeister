import type { Holiday, ReportTerm, SchoolYear } from './types';

/**
 * Schulkalender Bayern. Quellen:
 * - Ferienordnung für die Schuljahre 2024/2025 bis 2029/2030 (BayMBl. 2022 Nr. 747),
 * - km.bayern.de „Prüfungen und Zeugnisse“: Zwischenzeugnis am letzten Unterrichtstag
 *   der zweiten vollen Unterrichtswoche im Februar; Termine der Abschlussprüfung.
 * Buß- und Bettag ist unterrichtsfrei. Notenschluss legt jede Schule selbst fest,
 * daher hier nur ein Vorschlag.
 */

type Range = [start: string, end: string];

interface YearTable {
  /** Sommerferien vor dem Schuljahr und danach. */
  summerBefore: Range;
  summerAfter: Range;
  autumn: Range;
  christmas: Range;
  spring: Range;
  easter: Range;
  whitsun: Range;
  /** Schriftliche Abschlussprüfung Realschule (erster und letzter Prüfungstag). */
  finalExam?: Range;
}

const BAYERN: Record<number, YearTable> = {
  2026: {
    summerBefore: ['2026-08-03', '2026-09-14'],
    autumn: ['2026-11-02', '2026-11-06'],
    christmas: ['2026-12-24', '2027-01-08'],
    spring: ['2027-02-08', '2027-02-12'],
    easter: ['2027-03-22', '2027-04-02'],
    whitsun: ['2027-05-18', '2027-05-28'],
    summerAfter: ['2027-08-02', '2027-09-13'],
    finalExam: ['2027-06-22', '2027-07-02'],
  },
  2027: {
    summerBefore: ['2027-08-02', '2027-09-13'],
    autumn: ['2027-11-02', '2027-11-05'],
    christmas: ['2027-12-24', '2028-01-07'],
    spring: ['2028-02-28', '2028-03-03'],
    easter: ['2028-04-10', '2028-04-21'],
    whitsun: ['2028-06-06', '2028-06-16'],
    summerAfter: ['2028-07-31', '2028-09-11'],
  },
  2028: {
    summerBefore: ['2028-07-31', '2028-09-11'],
    autumn: ['2028-10-30', '2028-11-03'],
    christmas: ['2028-12-23', '2029-01-05'],
    spring: ['2029-02-12', '2029-02-16'],
    easter: ['2029-03-26', '2029-04-06'],
    whitsun: ['2029-05-22', '2029-06-01'],
    summerAfter: ['2029-07-30', '2029-09-10'],
  },
  2029: {
    summerBefore: ['2029-07-30', '2029-09-10'],
    autumn: ['2029-10-29', '2029-11-02'],
    christmas: ['2029-12-24', '2030-01-04'],
    spring: ['2030-03-04', '2030-03-08'],
    easter: ['2030-04-15', '2030-04-26'],
    whitsun: ['2030-06-11', '2030-06-21'],
    summerAfter: ['2030-07-29', '2030-09-09'],
  },
};

/** Vorschlag: Notenschluss zwei Wochen vor dem Zeugnis bzw. eine Woche vor der Abschlussprüfung. */
export const DEADLINE_DAYS_BEFORE_REPORT = 14;
export const DEADLINE_DAYS_BEFORE_EXAM = 7;

// ---------- Datumsrechnung (ohne Zeitzonen-Effekte) ----------

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return fromUtc(toUtc(iso) + n * 86_400_000);
}

/** Wochentag 0 = Sonntag … 6 = Samstag. */
export function weekday(iso: string): number {
  return new Date(toUtc(iso)).getUTCDay();
}

const isWeekend = (iso: string) => weekday(iso) === 0 || weekday(iso) === 6;

/** Buß- und Bettag: Mittwoch vor dem 23. November. */
export function repentanceDay(year: number): string {
  let d = `${year}-11-22`;
  while (weekday(d) !== 3) d = addDays(d, -1);
  return d;
}

function inRanges(iso: string, ranges: Array<{ start: string; end: string }>): boolean {
  return ranges.some((r) => iso >= r.start && iso <= r.end);
}

/** Letzter Unterrichtstag der zweiten vollen Unterrichtswoche im Februar. */
export function interimReportDay(calendarYear: number, holidays: Holiday[]): string | null {
  let monday = `${calendarYear}-02-01`;
  while (weekday(monday) !== 1) monday = addDays(monday, 1);
  let full = 0;
  for (; monday.slice(5, 7) === '02'; monday = addDays(monday, 7)) {
    const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    if (days.some((d) => d.slice(5, 7) !== '02' || inRanges(d, holidays))) continue;
    if (++full === 2) return days[4];
  }
  return null;
}

// ---------- Schuljahr aus der Tabelle ----------

export type YearSuggestion = Omit<SchoolYear, 'id'>;

/** Schuljahr mit Ferien und Zeugnisterminen nach der bayerischen Ferienordnung; null außerhalb der Tabelle. */
export function bavarianYear(startYear: number): YearSuggestion | null {
  const t = BAYERN[startYear];
  if (!t) return null;
  const holidays: Holiday[] = [
    { name: 'Herbstferien', start: t.autumn[0], end: t.autumn[1] },
    { name: 'Buß- und Bettag', start: repentanceDay(startYear), end: repentanceDay(startYear) },
    { name: 'Weihnachtsferien', start: t.christmas[0], end: t.christmas[1] },
    { name: 'Frühjahrsferien', start: t.spring[0], end: t.spring[1] },
    { name: 'Osterferien', start: t.easter[0], end: t.easter[1] },
    { name: 'Pfingstferien', start: t.whitsun[0], end: t.whitsun[1] },
  ];
  const start = addDays(t.summerBefore[1], 1);
  let end = addDays(t.summerAfter[0], -1);
  while (isWeekend(end)) end = addDays(end, -1);
  const zwischen = interimReportDay(startYear + 1, holidays)!;
  const y: YearSuggestion = {
    name: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
    start,
    halfSwitch: addDays(zwischen, 1),
    end,
    reportDays: { zwischen },
    reportDeadlines: {
      zwischen: addDays(zwischen, -DEADLINE_DAYS_BEFORE_REPORT),
      jahr: addDays(end, -DEADLINE_DAYS_BEFORE_REPORT),
    },
    holidays,
  };
  if (t.finalExam) y.finalExam = { start: t.finalExam[0], end: t.finalExam[1], deadline: addDays(t.finalExam[0], -DEADLINE_DAYS_BEFORE_EXAM) };
  return y;
}

/** Ob für dieses Schuljahr amtliche Ferientermine hinterlegt sind. */
export const hasBavarianTable = (startYear: number) => startYear in BAYERN;

// ---------- Abfragen für Startseite, Hinweise und Planung ----------

/** Ausgabetag eines Zeugnisses. */
export function reportDay(year: SchoolYear, term: ReportTerm): string {
  return term === 'zwischen' ? (year.reportDays?.zwischen ?? year.halfSwitch) : year.end;
}

/**
 * Notenschluss eines Zeugnisses; ohne Angabe der Ausgabetag. Für Jahrgangsstufe 10
 * gilt beim Jahreszeugnis der vorgezogene Notenschluss vor der Abschlussprüfung.
 */
export function deadlineFor(year: SchoolYear, term: ReportTerm, gradeLevel?: number): string {
  if (term === 'jahr' && gradeLevel === 10 && year.finalExam?.deadline) return year.finalExam.deadline;
  return year.reportDeadlines?.[term] ?? reportDay(year, term);
}

/** Ob ein eigener Notenschluss (abweichend vom Ausgabetag) hinterlegt ist. */
export function hasDeadline(year: SchoolYear, term: ReportTerm, gradeLevel?: number): boolean {
  return deadlineFor(year, term, gradeLevel) !== reportDay(year, term);
}

/** Ferien bzw. unterrichtsfreier Tag an diesem Datum. */
export function holidayAt(year: SchoolYear | undefined, iso: string): Holiday | undefined {
  return year?.holidays?.find((h) => iso >= h.start && iso <= h.end);
}
