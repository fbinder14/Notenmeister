/** Einlesen von Namenslisten aus CSV, Zwischenablage oder Tabellen. */

export type Rows = string[][];

/** Dekodiert Bytes als UTF-8; bei ungültigem UTF-8 als Windows-1252 (Excel-Export unter Windows). */
export function decodeText(bytes: Uint8Array): string {
  try {
    const s = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return s.replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best = ',';
  let bestScore = 0;
  for (const d of ['\t', ';', ',', '|']) {
    const counts = lines.map((l) => l.split(d).length - 1);
    const min = Math.min(...counts);
    const score = min > 0 ? min * 10 + (counts.every((c) => c === counts[0]) ? 5 : 0) : 0;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return bestScore ? best : '';
}

/** CSV-Parser nach RFC 4180 (Anführungszeichen, eingebettete Trenner und Zeilenumbrüche). */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): Rows {
  const rows: Rows = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      quoted = true;
    } else if (delimiter && ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
}

const LAST = /^(nach|familien|zu)?name$|^nachname|^familienname|^name$|^schüler.*name/i;
const FIRST = /^vorname|^rufname|^first/i;
const FULL = /^(schüler|name, vorname|vollständiger name)/i;

export interface Mapping {
  hasHeader: boolean;
  last: number; // Spalte Nachname (-1 = keine)
  first: number; // Spalte Vorname (-1 = keine)
  /** Nur eine Spalte mit vollem Namen: wie aufteilen? */
  split: 'komma' | 'vorname-zuerst' | 'nachname-zuerst';
}

export function guessMapping(rows: Rows): Mapping {
  const head = rows[0] ?? [];
  const li = head.findIndex((h) => LAST.test(h) && !FIRST.test(h));
  const fi = head.findIndex((h) => FIRST.test(h));
  const hasHeader = li >= 0 || fi >= 0 || head.some((h) => FULL.test(h));
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const sample = rows.slice(hasHeader ? 1 : 0, 6).map((r) => r[0] ?? '');
  const split: Mapping['split'] = sample.some((s) => s.includes(',')) ? 'komma' : 'vorname-zuerst';
  if (li >= 0 || fi >= 0) return { hasHeader, last: li, first: fi, split };
  if (cols >= 2) return { hasHeader, last: 0, first: 1, split };
  return { hasHeader, last: 0, first: -1, split };
}

export function splitFull(full: string, mode: Mapping['split']): { lastName: string; firstName: string } {
  const s = full.replace(/\s+/g, ' ').trim();
  if (mode === 'komma' || s.includes(',')) {
    const [a, ...b] = s.split(',');
    return { lastName: a.trim(), firstName: b.join(',').trim() };
  }
  const parts = s.split(' ');
  if (parts.length === 1) return { lastName: parts[0], firstName: '' };
  if (mode === 'nachname-zuerst') return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
  // Vorname zuerst: Nachnamenspräfixe wie „von“, „van“, „de“ gehören zum Nachnamen.
  let i = parts.length - 1;
  while (i > 1 && /^(von|van|de|der|den|zu|da|di|del|la|le|ten|ter)$/i.test(parts[i - 1])) i--;
  return { firstName: parts.slice(0, i).join(' '), lastName: parts.slice(i).join(' ') };
}

export function applyMapping(rows: Rows, m: Mapping): Array<{ lastName: string; firstName: string }> {
  const body = m.hasHeader ? rows.slice(1) : rows;
  const out: Array<{ lastName: string; firstName: string }> = [];
  for (const r of body) {
    let res: { lastName: string; firstName: string };
    if (m.first < 0) res = splitFull(r[m.last] ?? '', m.split);
    else res = { lastName: (r[m.last] ?? '').trim(), firstName: (r[m.first] ?? '').trim() };
    if (res.lastName || res.firstName) out.push(res);
  }
  return out;
}
