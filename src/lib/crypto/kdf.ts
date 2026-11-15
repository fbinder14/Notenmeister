import { fromBase64, randomBytes, toBase64, utf8 } from './encoding';

/**
 * Parameter der Schlüsselableitung. Versioniert, damit das Verfahren
 * später (z. B. auf Argon2id) umgestellt werden kann.
 */
export interface KdfParams {
  alg: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // Base64, 16 Byte
}

/** Empfehlung OWASP 2023 für PBKDF2-HMAC-SHA-256. */
export const DEFAULT_ITERATIONS = 600_000;

export function newKdfParams(iterations = DEFAULT_ITERATIONS): KdfParams {
  return { alg: 'PBKDF2-SHA256', iterations, salt: toBase64(randomBytes(16)) };
}

/**
 * Leitet aus dem Passwort einen AES-256-GCM-Schlüssel ab, der ausschließlich
 * zum Ein- und Auspacken des Datenschlüssels dient.
 */
export async function deriveWrappingKey(password: string, params: KdfParams): Promise<CryptoKey> {
  if (params.alg !== 'PBKDF2-SHA256') throw new Error(`Unbekanntes Ableitungsverfahren: ${params.alg}`);
  const base = await crypto.subtle.importKey('raw', utf8.encode(password.normalize('NFC')), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(params.salt), iterations: params.iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}
