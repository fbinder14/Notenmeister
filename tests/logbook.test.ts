import { describe, expect, it } from 'vitest';
import { appendLog, GROUP_MIN, LOG_DAYS, LOG_MAX, recentLog } from '../src/lib/domain/logbook';
import type { LogEntry, SchoolClass } from '../src/lib/domain/types';

let n = 0;
const entry = (at: string, p: Partial<LogEntry> = {}): LogEntry => ({ id: `e${++n}`, at, kind: 'grade', courseId: 'k', assessmentId: 'a', value: 2, ...p });
const cls = (log: LogEntry[], id = 'c'): SchoolClass =>
  ({ v: 1, id, yearId: 'y', name: id, gradeLevel: 7, wpf: '', students: [], courses: [], log, createdAt: '' }) as SchoolClass;

describe('Logbuch', () => {
  it('entfernt Einträge älter als die Aufbewahrungsfrist', () => {
    const now = new Date('2026-11-16T10:00:00Z');
    const old = entry(new Date(now.getTime() - (LOG_DAYS + 1) * 86_400_000).toISOString());
    const fresh = entry('2026-11-15T10:00:00Z');
    const out = appendLog([old, fresh], entry(now.toISOString()), now);
    expect(out.map((e) => e.id)).toEqual([fresh.id, out[1].id]);
  });

  it('begrenzt die Zahl der Einträge', () => {
    const t = '2026-11-16T10:00:00.000Z';
    const log = Array.from({ length: LOG_MAX }, () => entry(t));
    const out = appendLog(log, entry(t));
    expect(out).toHaveLength(LOG_MAX);
    expect(out[0].id).toBe(log[1].id);
  });

  it('fasst eine Sammeleingabe zu einer Zeile zusammen', () => {
    const log = [
      entry('2026-11-16T09:00:00Z'),
      entry('2026-11-16T09:01:00Z'),
      entry('2026-11-16T09:02:00Z'),
      entry('2026-11-16T09:05:00Z', { kind: 'note_added', assessmentId: undefined }),
    ];
    const items = recentLog([cls(log)]);
    expect(items.map((i) => i.type)).toEqual(['single', 'group']);
    expect(items[1].type === 'group' && items[1].entries).toHaveLength(3);
  });

  it('lässt wenige Noten und Änderungen einzeln stehen', () => {
    const log = Array.from({ length: GROUP_MIN - 1 }, (_, i) => entry(`2026-11-16T09:0${i}:00Z`));
    log.push(entry('2026-11-16T09:08:00Z', { changed: true, prev: 3 }));
    expect(recentLog([cls(log)]).every((i) => i.type === 'single')).toBe(true);
  });

  it('trennt Noten mit großem zeitlichem Abstand', () => {
    const log = [entry('2026-11-16T08:00:00Z'), entry('2026-11-16T08:01:00Z'), entry('2026-11-16T09:00:00Z'), entry('2026-11-16T09:01:00Z')];
    expect(recentLog([cls(log)]).every((i) => i.type === 'single')).toBe(true);
  });

  it('sortiert über alle Klassen, neueste zuerst', () => {
    const items = recentLog([cls([entry('2026-11-15T09:00:00Z')], 'a'), cls([entry('2026-11-16T09:00:00Z')], 'b')]);
    expect(items.map((i) => i.cls.id)).toEqual(['b', 'a']);
  });
});
