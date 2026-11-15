import { openJson, sealJson, type Sealed } from '../crypto/cipher';
import { unlockVault, type VaultHeader } from '../crypto/vault';
import type { Data } from '../domain/types';

/**
 * Format der Sicherungsdatei (*.notenmeister). Enthält den Tresorkopf und den
 * verschlüsselten Gesamtbestand. Ohne das Passwort, das beim Export galt,
 * lässt sich die Datei nicht lesen. Klartext wird nie geschrieben.
 */
export interface BackupFile {
  format: 'notenmeister-backup';
  v: 1;
  createdAt: string;
  vault: VaultHeader;
  data: Sealed;
}

const AAD = 'notenmeister:backup:v1';
export const BACKUP_EXT = '.notenmeister';

export async function buildBackup(header: VaultHeader, key: CryptoKey, data: Data): Promise<string> {
  const file: BackupFile = {
    format: 'notenmeister-backup',
    v: 1,
    createdAt: new Date().toISOString(),
    vault: header,
    data: await sealJson(key, data, `${AAD}:${header.wrapped.ct}`),
  };
  return JSON.stringify(file);
}

export class InvalidBackupError extends Error {
  constructor(msg = 'Die Datei ist keine gültige Notenmeister-Sicherung.') {
    super(msg);
    this.name = 'InvalidBackupError';
  }
}

export function parseBackup(text: string): BackupFile {
  let f: BackupFile;
  try {
    f = JSON.parse(text);
  } catch {
    throw new InvalidBackupError();
  }
  if (f?.format !== 'notenmeister-backup' || f.v !== 1 || !f.vault || !f.data?.iv || !f.data?.ct) {
    throw new InvalidBackupError();
  }
  return f;
}

/** Entschlüsselt eine Sicherung. Wirft WrongPasswordError oder InvalidBackupError. */
export async function openBackup(
  file: BackupFile,
  password: string,
): Promise<{ header: VaultHeader; key: CryptoKey; data: Data }> {
  const key = await unlockVault(file.vault, password);
  let data: Data;
  try {
    data = await openJson<Data>(key, file.data, `${AAD}:${file.vault.wrapped.ct}`);
  } catch {
    throw new InvalidBackupError('Die Sicherung ist beschädigt oder wurde verändert.');
  }
  if (!data?.core || !Array.isArray(data.classes)) throw new InvalidBackupError();
  return { header: file.vault, key, data };
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `Notenmeister_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}${BACKUP_EXT}`;
}
