import { describe, expect, it } from 'vitest';
import { addDays, bavarianYear, deadlineFor, hasBavarianTable, holidayAt, interimReportDay, repentanceDay, reportDay, weekday } from '../src/lib/domain/calendar';
import { suggestYear } from '../src/lib/domain/defaults';
import type { SchoolYear } from '../src/lib/domain/types';

describe('Datumsrechnung', () => {
  it('rechnet über Monats- und Jahresgrenzen ohne Zeitzonenfehler', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // Umstellung auf Sommerzeit
    expect(weekday('2027-02-19')).toBe(5);
  });

  it('kennt den Buß- und Bettag', () => {
    expect(repentanceDay(2026)).toBe('2026-11-18');
    expect(repentanceDay(2027)).toBe('2027-11-17');
    expect(repentanceDay(2028)).toBe('2028-11-22');
  });
});

describe('Bayerischer Schulkalender', () => {
  it('liefert 2026/27 mit amtlichen Terminen', () => {
    const y = bavarianYear(2026)!;
    expect(y.name).toBe('2026/27');
    expect(y.start).toBe('2026-09-15');
    // km.bayern.de: Jahreszeugnis 30. Juli 2027, Zwischenzeugnis 19. Februar 2027.
    expect(y.end).toBe('2027-07-30');
    expect(y.reportDays?.zwischen).toBe('2027-02-19');
    expect(y.halfSwitch).toBe('2027-02-20');
    expect(y.holidays?.map((h) => h.name)).toEqual(['Herbstferien', 'Buß- und Bettag', 'Weihnachtsferien', 'Frühjahrsferien', 'Osterferien', 'Pfingstferien']);
    expect(y.finalExam).toEqual({ start: '2027-06-22', end: '2027-07-02', deadline: '2027-06-15' });
    expect(y.reportDeadlines).toEqual({ zwischen: '2027-02-05', jahr: '2027-07-16' });
  });

  it('legt Zeugnistage auf Unterrichtstage', () => {
    for (const start of [2026, 2027, 2028, 2029]) {
      const y = bavarianYear(start)!;
      expect(weekday(y.end)).toBe(5);
      expect(weekday(y.reportDays!.zwischen!)).toBe(5);
      expect(holidayAt(y as SchoolYear, y.reportDays!.zwischen!)).toBeUndefined();
      expect(y.start < y.halfSwitch && y.halfSwitch < y.end).toBe(true);
    }
  });

  it('überspringt Ferienwochen beim Zwischenzeugnis', () => {
    const y = bavarianYear(2026)!;
    expect(interimReportDay(2027, y.holidays!)).toBe('2027-02-19');
    expect(interimReportDay(2027, [])).toBe('2027-02-12');
  });

  it('kennt nur die hinterlegten Jahre', () => {
    expect(hasBavarianTable(2029)).toBe(true);
    expect(bavarianYear(2030)).toBeNull();
  });

  it('schlägt das laufende Schuljahr vor, sonst nach Muster', () => {
    expect(suggestYear(new Date('2026-11-25T12:00')).reportDays?.zwischen).toBe('2027-02-19');
    const later = suggestYear(new Date('2031-10-01T12:00'));
    expect(later.name).toBe('2031/32');
    expect(later.holidays).toBeUndefined();
  });
});

describe('Zeugnistermine und Notenschluss', () => {
  const legacy: SchoolYear = { id: 'y', name: '2026/27', start: '2026-09-15', halfSwitch: '2027-02-14', end: '2027-07-31' };
  const full: SchoolYear = { id: 'y', ...bavarianYear(2026)! };

  it('fällt ohne neue Angaben auf Halbjahreswechsel und Ende zurück', () => {
    expect(reportDay(legacy, 'zwischen')).toBe('2027-02-14');
    expect(deadlineFor(legacy, 'zwischen')).toBe('2027-02-14');
    expect(deadlineFor(legacy, 'jahr', 10)).toBe('2027-07-31');
    expect(holidayAt(legacy, '2026-11-03')).toBeUndefined();
  });

  it('nutzt Notenschluss und vorgezogenen Notenschluss der 10. Klassen', () => {
    expect(reportDay(full, 'zwischen')).toBe('2027-02-19');
    expect(deadlineFor(full, 'zwischen', 10)).toBe('2027-02-05');
    expect(deadlineFor(full, 'jahr', 9)).toBe('2027-07-16');
    expect(deadlineFor(full, 'jahr', 10)).toBe('2027-06-15');
    expect(holidayAt(full, '2026-11-18')?.name).toBe('Buß- und Bettag');
    expect(holidayAt(full, '2027-04-01')?.name).toBe('Osterferien');
  });
});
