/** Schlanke Promise-Hülle um IndexedDB. Gespeichert werden nur verschlüsselte Blöcke. */

const DB_NAME = 'notenmeister';
const DB_VERSION = 1;
export const STORE_META = 'meta';
export const STORE_CHUNKS = 'chunks';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) db.createObjectStore(STORE_CHUNKS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error);
  });
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return result(db.transaction(STORE_META).objectStore(STORE_META).get(key)) as Promise<T | undefined>;
}

export async function getAllChunks<T>(): Promise<Array<{ key: string; value: T }>> {
  const db = await openDb();
  const store = db.transaction(STORE_CHUNKS).objectStore(STORE_CHUNKS);
  const [keys, values] = await Promise.all([result(store.getAllKeys()), result(store.getAll())]);
  return keys.map((k, i) => ({ key: String(k), value: values[i] as T }));
}

export interface WriteOp {
  store: typeof STORE_META | typeof STORE_CHUNKS;
  key: string;
  value?: unknown; // undefined = löschen
}

/** Schreibt mehrere Änderungen in einer Transaktion: ganz oder gar nicht. */
export async function writeAll(ops: WriteOp[], clearChunks = false): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE_META, STORE_CHUNKS], 'readwrite');
  if (clearChunks) tx.objectStore(STORE_CHUNKS).clear();
  for (const op of ops) {
    const s = tx.objectStore(op.store);
    if (op.value === undefined) s.delete(op.key);
    else s.put(op.value, op.key);
  }
  await done(tx);
}

/** Löscht den gesamten Bestand dieses Browsers. */
export async function wipe(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE_META, STORE_CHUNKS], 'readwrite');
  tx.objectStore(STORE_META).clear();
  tx.objectStore(STORE_CHUNKS).clear();
  await done(tx);
}

/** Bittet den Browser, die Daten nicht bei Speicherknappheit zu verwerfen. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
