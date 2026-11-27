import type { SportField, SportGroup, SportThresholds, SportUnit } from './types';

/**
 * ISB-Orientierungstabellen „Empfehlungen zur Leistungsbewertung im Sport für weiterführende
 * Schulen“ (2023), Leichtathletik und Schwimmen, Jahrgangsstufen 5–10. Grenzwerte für die
 * Noten 1–5 jeweils „ab“ (einschließlich); Zeiten in Sekunden, Weiten und Strecken in Metern.
 * Die Tabellen sind nicht verbindlich und werden beim Anlegen eines Nachweises kopiert.
 * Quelle: https://www.isb.bayern.de/fileadmin/user_upload/Gymnasium/Faecher/Sport/Leistungserhebungen/2_Empfehlungen_zur_Leistungsbewertung_Sport_fuer_weiterfuehrende_Schulen_2023_Leichtathletik_Schwimmen.pdf
 */

export interface Discipline {
  id: string;
  name: string;
  field: SportField;
  unit: SportUnit;
  better: 'low' | 'high';
  /** Übliche Zahl der Versuche (gewertet wird der beste). */
  attempts: number;
  /** Grenzwerte je Jahrgangsstufe und Wertungstabelle. */
  levels: Partial<Record<number, Partial<Record<SportGroup, SportThresholds>>>>;
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 'sprint50',
    name: '50-m-Lauf',
    field: 'leichtathletik',
    unit: 's',
    better: 'low',
    attempts: 2,
    levels: { 5: { w: [8.7, 9.3, 9.9, 10.6, 11.5], m: [8.5, 9.1, 9.7, 10.4, 11.2] }, 6: { w: [8.5, 9, 9.6, 10.2, 11.1], m: [8.2, 8.8, 9.3, 10, 10.8] }, 7: { w: [8.2, 8.6, 9.2, 9.9, 10.7], m: [8, 8.4, 8.9, 9.6, 10.3] } },
  },
  {
    id: 'sprint75',
    name: '75-m-Lauf',
    field: 'leichtathletik',
    unit: 's',
    better: 'low',
    attempts: 2,
    levels: { 7: { w: [11.9, 12.7, 13.5, 14.4, 15.4], m: [11.4, 12.1, 12.9, 13.7, 14.6] }, 8: { w: [11.7, 12.4, 13.2, 14.1, 15], m: [11.1, 11.8, 12.5, 13.3, 14.2] }, 9: { w: [11.5, 12.1, 12.8, 13.7, 14.6], m: [10.9, 11.4, 12.1, 12.9, 13.7] } },
  },
  {
    id: 'sprint100',
    name: '100-m-Lauf',
    field: 'leichtathletik',
    unit: 's',
    better: 'low',
    attempts: 2,
    levels: { 9: { w: [15, 15.9, 16.8, 17.8, 19], m: [13.6, 14.3, 15.2, 16.1, 17.1] }, 10: { w: [14.8, 15.6, 16.5, 17.5, 18.6], m: [13.3, 14, 14.8, 15.7, 16.7] } },
  },
  {
    id: 'lauf800',
    name: '800-m-Lauf',
    field: 'leichtathletik',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 9: { w: [200, 223, 248, 276, 307], m: [163, 176, 196, 214, 245] }, 10: { w: [197, 219, 243, 272, 304], m: [159, 171, 187, 204, 232] } },
  },
  {
    id: 'lauf12min',
    name: '12-Minuten-Lauf',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 1,
    levels: { 7: { w: [2300, 2100, 1850, 1600, 1300], m: [2600, 2400, 2150, 1850, 1450] }, 8: { w: [2350, 2150, 1900, 1650, 1350], m: [2700, 2450, 2200, 1900, 1500] }, 9: { w: [2400, 2200, 1950, 1700, 1400], m: [2750, 2500, 2250, 1950, 1550] }, 10: { w: [2450, 2250, 2000, 1750, 1450], m: [2800, 2600, 2350, 2000, 1600] } },
  },
  {
    id: 'ausdauerLauf',
    name: 'Ausdauerlauf (Dauer)',
    field: 'leichtathletik',
    unit: 's',
    better: 'high',
    attempts: 1,
    levels: { 5: { w: [1200, 1080, 900, 720, 480], m: [1200, 1080, 900, 720, 480] }, 6: { w: [1440, 1260, 1080, 840, 600], m: [1440, 1260, 1080, 840, 600] }, 7: { w: [1620, 1440, 1260, 960, 660], m: [1620, 1440, 1260, 960, 660] }, 8: { w: [1800, 1620, 1380, 1080, 720], m: [1800, 1620, 1380, 1080, 720] }, 9: { w: [1980, 1800, 1500, 1200, 780], m: [1980, 1800, 1500, 1200, 780] }, 10: { w: [2100, 1860, 1620, 1260, 840], m: [2100, 1860, 1620, 1260, 840] } },
  },
  {
    id: 'weit',
    name: 'Weitsprung',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 5: { w: [3.4, 3.06, 2.7, 2.31, 1.9], m: [3.56, 3.24, 2.89, 2.52, 2.13] }, 6: { w: [3.5, 3.17, 2.81, 2.41, 1.99], m: [3.8, 3.47, 3.1, 2.71, 2.29] }, 7: { w: [3.61, 3.28, 2.91, 2.52, 2.09], m: [4.04, 3.71, 3.32, 2.9, 2.44] }, 8: { w: [3.71, 3.39, 3.02, 2.62, 2.18], m: [4.28, 3.94, 3.53, 3.09, 2.6] }, 9: { w: [3.81, 3.49, 3.13, 2.72, 2.27], m: [4.53, 4.17, 3.75, 3.27, 2.76] }, 10: { w: [3.91, 3.6, 3.24, 2.82, 2.36], m: [4.77, 4.4, 3.96, 3.46, 2.92] } },
  },
  {
    id: 'hoch',
    name: 'Hochsprung',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 5: { w: [1.03, 0.97, 0.89, 0.8, 0.68], m: [1.1, 1.02, 0.94, 0.85, 0.76] }, 6: { w: [1.07, 1, 0.92, 0.83, 0.72], m: [1.17, 1.09, 1, 0.91, 0.81] }, 7: { w: [1.11, 1.04, 0.97, 0.88, 0.77], m: [1.23, 1.15, 1.07, 0.96, 0.86] }, 8: { w: [1.16, 1.09, 1.01, 0.93, 0.83], m: [1.3, 1.22, 1.13, 1.02, 0.91] }, 9: { w: [1.2, 1.13, 1.06, 0.98, 0.88], m: [1.37, 1.29, 1.19, 1.08, 0.95] }, 10: { w: [1.25, 1.18, 1.1, 1.02, 0.93], m: [1.44, 1.36, 1.25, 1.14, 1] } },
  },
  {
    id: 'wurf80',
    name: 'Wurf 80 g',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 5: { w: [20, 17.5, 15, 12, 10], m: [33, 28.5, 24, 19.5, 14] }, 6: { w: [25, 22, 19, 15.5, 12] } },
  },
  {
    id: 'wurf200',
    name: 'Wurf 200 g',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 6: { m: [33, 29.5, 26, 20.5, 12] }, 7: { w: [25, 21.5, 18, 14, 10], m: [37, 33.5, 29, 23, 14] }, 8: { w: [27.5, 24.5, 20.5, 16, 11], m: [42, 37.5, 32.5, 25.5, 17] }, 9: { w: [31.5, 27.5, 23, 18, 12], m: [47, 41.5, 35.5, 28, 19] } },
  },
  {
    id: 'kugel3',
    name: 'Kugelstoß 3 kg',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 8: { w: [7.2, 6.5, 5.7, 4.7, 3.5], m: [8.12, 7.22, 6.31, 5.21, 3.92] }, 9: { w: [7.4, 6.7, 5.9, 4.9, 3.7] } },
  },
  {
    id: 'kugel4',
    name: 'Kugelstoß 4 kg',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 9: { m: [9, 8.1, 7, 5.8, 4.5] }, 10: { w: [7.3, 6.5, 5.6, 4.6, 3.6] } },
  },
  {
    id: 'kugel5',
    name: 'Kugelstoß 5 kg',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 10: { m: [8.8, 7.9, 6.9, 5.7, 4.3] } },
  },
  {
    id: 'speer400',
    name: 'Speerwurf 400 g',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 10: { w: [21, 18.6, 15.9, 13.1, 10] } },
  },
  {
    id: 'speer600',
    name: 'Speerwurf 600 g',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 10: { m: [33, 29.1, 24.5, 19.2, 13] } },
  },
  {
    id: 'schleuder1',
    name: 'Schleuderball 1 kg',
    field: 'leichtathletik',
    unit: 'm',
    better: 'high',
    attempts: 3,
    levels: { 9: { w: [25, 22, 19, 15.5, 11.5] }, 10: { w: [27.5, 25, 21.5, 18, 13.5] } },
  },
  {
    id: 'brust25',
    name: '25 m Brust',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 5: { w: [26, 28.8, 32.3, 36.7, 42], m: [25, 27.8, 31.3, 35.7, 41] } },
  },
  {
    id: 'frei25',
    name: '25 m Freistil',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 5: { w: [24, 26.8, 30.3, 34.7, 40], m: [22, 24.8, 28.3, 32.7, 38] } },
  },
  {
    id: 'brust50',
    name: '50 m Brust',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 6: { w: [57.6, 64.4, 72.5, 81.9, 93], m: [54.9, 62.5, 70.9, 79.9, 89.8] }, 7: { w: [56.3, 62.7, 70.4, 79.6, 90.4], m: [53.2, 60.3, 68.3, 77, 86.8] }, 8: { w: [54.9, 61, 68.4, 77.2, 87.8], m: [51.5, 58.1, 65.6, 74.1, 83.8] }, 9: { w: [53.6, 59.3, 66.4, 74.8, 85.3], m: [49.8, 55.9, 63, 71.1, 80.8] }, 10: { w: [52.3, 57.6, 64.3, 72.5, 82.7], m: [48.1, 53.7, 60.3, 68.2, 77.7] } },
  },
  {
    id: 'frei50',
    name: '50 m Freistil',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 6: { w: [54.6, 62.4, 70.8, 80.1, 90.2], m: [51, 58.4, 66.5, 75.4, 85] }, 7: { w: [52.1, 59.3, 67.1, 75.9, 85.7], m: [48.5, 55.3, 62.8, 71.3, 80.6] }, 8: { w: [49.7, 56.2, 63.4, 71.7, 81.1], m: [46, 52.1, 59.1, 67.1, 76.2] }, 9: { w: [47.2, 53.1, 59.7, 67.5, 76.5], m: [43.5, 49, 55.5, 63, 71.9] }, 10: { w: [44.7, 49.9, 56, 63.3, 72], m: [40.9, 45.9, 51.8, 58.9, 67.5] } },
  },
  {
    id: 'rs50',
    name: '50 m Rücken/Schmetterling (R/S)',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 6: { w: [58, 65.7, 74.1, 83.1, 93], m: [53, 60.6, 69, 78.1, 88] }, 7: { w: [56.2, 63.4, 71.4, 80.1, 89.9], m: [51.1, 58.2, 66.1, 74.8, 84.5] }, 8: { w: [54.4, 61.2, 68.7, 77.2, 86.7], m: [49.3, 55.8, 63.3, 71.6, 81] }, 9: { w: [52.7, 58.9, 66, 74.2, 83.6], m: [47.4, 53.4, 60.4, 68.3, 77.6] }, 10: { w: [50.9, 56.6, 63.4, 71.2, 80.5], m: [45.5, 51.1, 57.5, 65.1, 74.1] } },
  },
  {
    id: 'brust100',
    name: '100 m Brust',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 8: { w: [130.1, 145.1, 161.6, 179.6, 199.5], m: [120.7, 135.9, 153.2, 172.5, 194.5] }, 9: { w: [125.9, 139.8, 155.4, 172.7, 192.1], m: [115.9, 129.9, 145.8, 163.4, 183.5] }, 10: { w: [121.7, 134.6, 149.3, 165.8, 184.7], m: [111.1, 123.9, 138.3, 154.4, 172.5] } },
  },
  {
    id: 'frei100',
    name: '100 m Freistil',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 9: { w: [112.7, 128.2, 145.3, 164.6, 186.6], m: [101.4, 115.7, 131.5, 149.4, 169.6] }, 10: { w: [107.3, 121.2, 136.7, 154.2, 174.1], m: [95.8, 108.6, 123, 139.4, 158.1] } },
  },
  {
    id: 'rs100',
    name: '100 m Rücken/Schmetterling (R/S)',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 10: { w: [118.9, 132.1, 146.8, 163.1, 181.5], m: [109.2, 122, 135.8, 150.8, 167.4] } },
  },
  {
    id: 'brust400',
    name: '400 m Brust',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 10: { w: [636.5, 705.4, 783.4, 870.5, 969.7], m: [591.6, 642.9, 706.4, 783.1, 876.8] } },
  },
  {
    id: 'frei400',
    name: '400 m Freistil',
    field: 'schwimmen',
    unit: 's',
    better: 'low',
    attempts: 1,
    levels: { 10: { w: [602.4, 690.2, 781.8, 881.1, 985.8], m: [551.1, 627.5, 707.8, 794.9, 887] } },
  },
  {
    id: 'ausdauerSchwimmen',
    name: 'Ausdauerschwimmen (Dauer)',
    field: 'schwimmen',
    unit: 's',
    better: 'high',
    attempts: 1,
    levels: { 5: { w: [1200, 1080, 900, 720, 480], m: [1200, 1080, 900, 720, 480] }, 6: { w: [1440, 1260, 1080, 840, 600], m: [1440, 1260, 1080, 840, 600] }, 7: { w: [1620, 1440, 1260, 960, 660], m: [1620, 1440, 1260, 960, 660] }, 8: { w: [1800, 1620, 1380, 1080, 720], m: [1800, 1620, 1380, 1080, 720] }, 9: { w: [1980, 1800, 1500, 1200, 780], m: [1980, 1800, 1500, 1200, 780] }, 10: { w: [2100, 1860, 1620, 1260, 840], m: [2100, 1860, 1620, 1260, 840] } },
  },
];

export const disciplineById = (id: string | undefined) => DISCIPLINES.find((d) => d.id === id);

/** Grenzwerte (Kopie) für Disziplin, Jahrgangsstufe und Wertungstabelle; null, wenn nicht vorgesehen. */
export function isbThresholds(id: string, gradeLevel: number, group: SportGroup): SportThresholds | null {
  const t = disciplineById(id)?.levels[gradeLevel]?.[group];
  return t ? [...t] : null;
}

/** Ob die Disziplin für Jahrgangsstufe und Wertungstabelle eine ISB-Tabelle hat. */
export const hasTable = (id: string, gradeLevel: number, group: SportGroup | undefined) => !!group && !!disciplineById(id)?.levels[gradeLevel]?.[group];
