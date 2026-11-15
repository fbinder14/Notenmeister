import { openJson, sealJson, type Sealed } from '../crypto/cipher';
import type { VaultHeader } from '../crypto/vault';
import type { Core, Data, SchoolClass } from '../domain/types';
import { getAllChunks, getMeta, STORE_CHUNKS, STORE_META, writeAll, type WriteOp } from './idb';

/**
 * Verschlüsselte Ablage. Ein Block für die Stammdaten („core“), ein Block je
 * Klasse. Die Klassen-ID dient zugleich als Blockschlüssel; sie ist zufällig
 * und verrät nichts über den Inhalt. Die ID ist als Zusatzdatum (AAD) an den
 * Block gebunden, damit Blöcke nicht unbemerkt vertauscht werden können.
 */

export const CORE_KEY = 'core';
const aad = (key: string) => `notenmeister:chunk:v1:${key}`;

export async function loadHeader(): Promise<VaultHeader | undefined> {
  return getMeta<VaultHeader>('vault');
}

export async function loadData(key: CryptoKey): Promise<Data> {
  const chunks = await getAllChunks<Sealed>();
  let core: Core | undefined;
  const classes: SchoolClass[] = [];
  for (const c of chunks) {
    const value = await openJson<Core | SchoolClass>(key, c.value, aad(c.key));
    if (c.key === CORE_KEY) core = value as Core;
    else classes.push(value as SchoolClass);
  }
  if (!core) throw new Error('Die Stammdaten fehlen im Tresor.');
  classes.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
  return { core, classes };
}

export async function sealChunk(key: CryptoKey, id: string, value: Core | SchoolClass): Promise<WriteOp> {
  return { store: STORE_CHUNKS, key: id, value: await sealJson(key, value, aad(id)) };
}

/** Speichert geänderte Blöcke und entfernt gelöschte Klassen. */
export async function saveChunks(
  key: CryptoKey,
  changed: Array<{ id: string; value: Core | SchoolClass }>,
  removed: string[] = [],
): Promise<void> {
  const ops = await Promise.all(changed.map((c) => sealChunk(key, c.id, c.value)));
  for (const id of removed) ops.push({ store: STORE_CHUNKS, key: id });
  await writeAll(ops);
}

/** Ersetzt den gesamten Bestand (Ersteinrichtung, Import, Passwortwechsel). */
export async function replaceAll(header: VaultHeader, key: CryptoKey, data: Data): Promise<void> {
  const ops: WriteOp[] = [{ store: STORE_META, key: 'vault', value: header }];
  ops.push(await sealChunk(key, CORE_KEY, data.core));
  for (const c of data.classes) ops.push(await sealChunk(key, c.id, c));
  await writeAll(ops, true);
}

export async function saveHeader(header: VaultHeader): Promise<void> {
  await writeAll([{ store: STORE_META, key: 'vault', value: header }]);
}
