import { fromBase64, randomBytes, toBase64, utf8 } from './encoding';

/** Verschlüsselter Block: AES-256-GCM, 96-Bit-IV, Base64-kodiert. */
export interface Sealed {
  iv: string;
  ct: string;
}

export async function sealBytes(key: CryptoKey, plain: Uint8Array<ArrayBuffer>, aad: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(aad) }, key, plain);
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function openBytes(key: CryptoKey, sealed: Sealed, aad: string): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: utf8.encode(aad) },
    key,
    fromBase64(sealed.ct),
  );
  return new Uint8Array(plain);
}

export async function sealJson(key: CryptoKey, value: unknown, aad: string): Promise<Sealed> {
  return sealBytes(key, utf8.encode(JSON.stringify(value)), aad);
}

export async function openJson<T>(key: CryptoKey, sealed: Sealed, aad: string): Promise<T> {
  return JSON.parse(utf8.decode(await openBytes(key, sealed, aad))) as T;
}
