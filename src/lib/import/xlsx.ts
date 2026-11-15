import type { Rows } from './table';

/**
 * Minimaler Leser für das erste Tabellenblatt einer .xlsx-Datei – ohne
 * Fremdbibliothek. Nutzt den ZIP-Aufbau und die im Browser eingebaute
 * DecompressionStream-API.
 */

interface Entry {
  name: string;
  method: number;
  compSize: number;
  offset: number;
}

function readEntries(buf: Uint8Array): Map<string, Entry> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Keine gültige Excel-Datei.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const map = new Map<string, Entry>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    map.set(name, { name, method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return map;
}

async function readFile(buf: Uint8Array, e: Entry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameLen = dv.getUint16(e.offset + 26, true);
  const extraLen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = buf.slice(start, start + e.compSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error('Nicht unterstützte Komprimierung.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(bytes: Uint8Array): Promise<Rows> {
  const entries = readEntries(bytes);
  const parser = new DOMParser();
  const xml = async (name: string) => {
    const e = entries.get(name);
    return e ? parser.parseFromString(await readFile(bytes, e), 'application/xml') : null;
  };

  // Erstes Blatt über workbook.xml und die Beziehungen ermitteln.
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await xml('xl/workbook.xml');
  const rels = await xml('xl/_rels/workbook.xml.rels');
  const first = wb?.getElementsByTagName('sheet')[0];
  const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  if (rid && rels) {
    for (const r of Array.from(rels.getElementsByTagName('Relationship'))) {
      if (r.getAttribute('Id') === rid) {
        const target = r.getAttribute('Target') ?? '';
        sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
      }
    }
  }

  const shared: string[] = [];
  const sst = await xml('xl/sharedStrings.xml');
  if (sst) {
    for (const si of Array.from(sst.getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''));
    }
  }

  const sheet = await xml(sheetPath);
  if (!sheet) throw new Error('Das Tabellenblatt wurde nicht gefunden.');
  const rows: Rows = [];
  for (const row of Array.from(sheet.getElementsByTagName('row'))) {
    const out: string[] = [];
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const idx = colIndex(c.getAttribute('r') ?? 'A');
      const t = c.getAttribute('t');
      let v = '';
      if (t === 's') v = shared[Number(c.getElementsByTagName('v')[0]?.textContent ?? -1)] ?? '';
      else if (t === 'inlineStr') v = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent ?? '').join('');
      else v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      out[idx] = v.trim();
    }
    const filled = Array.from(out, (x) => x ?? '');
    if (filled.some((x) => x)) rows.push(filled);
  }
  return rows;
}
