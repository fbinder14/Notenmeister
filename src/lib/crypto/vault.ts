import { fromBase64, randomBytes, toBase64, utf8 } from './encoding';
import { deriveWrappingKey, newKdfParams, type KdfParams } from './kdf';

/**
 * Kopf des Tresors. Enthält keine personenbezogenen Daten, nur das, was zum
 * Entsperren nötig ist: Salt, Ableitungsparameter und den mit dem
 * Passwortschlüssel verpackten Datenschlüssel.
 */
export interface VaultHeader {
  format: 'notenmeister-vault';
  v: 1;
  kdf: KdfParams;
  wrapped: { iv: string; ct: string };
}

const WRAP_AAD = 'notenmeister:dek:v1';

export class WrongPasswordError extends Error {
  constructor() {
    super('Das Passwort ist falsch.');
    this.name = 'WrongPasswordError';
  }
}

export const MIN_PASSWORD_LENGTH = 12;

async function wrap(dek: CryptoKey, password: string, kdf: KdfParams): Promise<VaultHeader> {
  const kek = await deriveWrappingKey(password, kdf);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.wrapKey('raw', dek, kek, {
    name: 'AES-GCM',
    iv,
    additionalData: utf8.encode(WRAP_AAD),
  });
  return {
    format: 'notenmeister-vault',
    v: 1,
    kdf,
    wrapped: { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) },
  };
}

async function unwrap(header: VaultHeader, password: string, extractable: boolean): Promise<CryptoKey> {
  if (header.format !== 'notenmeister-vault' || header.v !== 1) {
    throw new Error('Unbekanntes Tresorformat.');
  }
  const kek = await deriveWrappingKey(password, header.kdf);
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(header.wrapped.ct),
      kek,
      { name: 'AES-GCM', iv: fromBase64(header.wrapped.iv), additionalData: utf8.encode(WRAP_AAD) },
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new WrongPasswordError();
  }
}

/** Legt einen neuen Tresor an. Der zurückgegebene Schlüssel ist nicht exportierbar. */
export async function createVault(
  password: string,
  iterations?: number,
): Promise<{ header: VaultHeader; key: CryptoKey }> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
  }
  const temp = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const header = await wrap(temp, password, newKdfParams(iterations));
  // Nicht exportierbare Kopie für den Betrieb; die exportierbare wird verworfen.
  const key = await unwrap(header, password, false);
  return { header, key };
}

export async function unlockVault(header: VaultHeader, password: string): Promise<CryptoKey> {
  return unwrap(header, password, false);
}

/** Verpackt den Datenschlüssel neu. Die Daten selbst bleiben unverändert. */
export async function changePassword(
  header: VaultHeader,
  oldPassword: string,
  newPassword: string,
  iterations?: number,
): Promise<VaultHeader> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
  }
  const dek = await unwrap(header, oldPassword, true);
  return wrap(dek, newPassword, newKdfParams(iterations ?? header.kdf.iterations));
}
