import { describe, expect, it } from 'vitest';
import { applyMapping, decodeText, detectDelimiter, guessMapping, parseCsv, splitFull } from '../src/lib/import/table';

describe('CSV-Import', () => {
  it('erkennt Semikolon, Komma und Tabulator', () => {
    expect(detectDelimiter('Name;Vorname\nHuber;Lena')).toBe(';');
    expect(detectDelimiter('Huber, Lena\nÖztürk, Can')).toBe(',');
    expect(detectDelimiter('Huber\tLena\nÖztürk\tCan')).toBe('\t');
    expect(detectDelimiter('Lena Huber\nCan Öztürk')).toBe('');
  });

  it('verarbeitet Anführungszeichen und Zeilenumbrüche', () => {
    expect(parseCsv('"Müller; Jr.";"Anna ""Anni"""\r\nB;C\r\n')).toEqual([
      ['Müller; Jr.', 'Anna "Anni"'],
      ['B', 'C'],
    ]);
  });

  it('erkennt Kopfzeile und Spalten', () => {
    const rows = parseCsv('Nr;Vorname;Nachname\n1;Lena;Huber\n2;Can;Öztürk');
    const m = guessMapping(rows);
    expect(m).toMatchObject({ hasHeader: true, last: 2, first: 1 });
    expect(applyMapping(rows, m)).toEqual([
      { lastName: 'Huber', firstName: 'Lena' },
      { lastName: 'Öztürk', firstName: 'Can' },
    ]);
  });

  it('kommt mit gemischten Listen aus Komma- und Freitextzeilen zurecht', () => {
    const rows = parseCsv('Huber, Lena\nMaximilian von Stein\nÖztürk, Can');
    expect(applyMapping(rows, guessMapping(rows))).toEqual([
      { lastName: 'Huber', firstName: 'Lena' },
      { lastName: 'von Stein', firstName: 'Maximilian' },
      { lastName: 'Öztürk', firstName: 'Can' },
    ]);
  });

  it('teilt volle Namen auf', () => {
    expect(splitFull('Huber, Lena Marie', 'komma')).toEqual({ lastName: 'Huber', firstName: 'Lena Marie' });
    expect(splitFull('Lena Marie Huber', 'vorname-zuerst')).toEqual({ lastName: 'Huber', firstName: 'Lena Marie' });
    expect(splitFull('Ludwig van Beethoven', 'vorname-zuerst')).toEqual({ lastName: 'van Beethoven', firstName: 'Ludwig' });
    expect(splitFull('Huber Lena', 'nachname-zuerst')).toEqual({ lastName: 'Huber', firstName: 'Lena' });
  });

  it('dekodiert Windows-1252 aus älteren Excel-Exporten', () => {
    const bytes = new Uint8Array([0xd6, 0x7a, 0x74, 0xfc, 0x72, 0x6b]); // „Öztürk“ in Windows-1252
    expect(decodeText(bytes)).toBe('Öztürk');
    expect(decodeText(new TextEncoder().encode('﻿Öztürk'))).toBe('Öztürk');
  });
});
