import { describe, expect, it } from 'vitest';
import { openJson, sealJson } from '../src/lib/crypto/cipher';
import { fromBase64 } from '../src/lib/crypto/encoding';
import { changePassword, createVault, unlockVault, WrongPasswordError } from '../src/lib/crypto/vault';
import { buildBackup, InvalidBackupError, openBackup, parseBackup } from '../src/lib/storage/backupFile';
import { emptyCore } from '../src/lib/domain/defaults';
import type { Data } from '../src/lib/domain/types';

const IT = 1000; // schnelle Tests; in der App gelten 600.000 Runden
const PW = 'korrekt-pferd-batterie';

function sample(): Data {
  const core = emptyCore();
  return {
    core,
    classes: [
      {
        v: 1,
        id: 'k1',
        yearId: 'y',
        name: '7a',
        gradeLevel: 7,
        wpf: 'II',
        students: [{ id: 's1', lastName: 'Huber', firstName: 'Lena' }],
        courses: [],
        createdAt: '2026-09-15T08:00:00.000Z',
      },
    ],
  };
}

describe('Tresor', () => {
  it('ver- und entschlüsselt mit dem richtigen Passwort', async () => {
    const { header, key } = await createVault(PW, IT);
    const sealed = await sealJson(key, { name: 'Lena Huber' }, 'a');
    const key2 = await unlockVault(header, PW);
    expect(await openJson(key2, sealed, 'a')).toEqual({ name: 'Lena Huber' });
  });

  it('lehnt ein falsches Passwort ab', async () => {
    const { header } = await createVault(PW, IT);
    await expect(unlockVault(header, 'falsches-passwort!')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('lehnt zu kurze Passwörter ab', async () => {
    await expect(createVault('kurz', IT)).rejects.toThrow(/mindestens 12/);
  });

  it('Schlüssel ist nicht exportierbar', async () => {
    const { key } = await createVault(PW, IT);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toBeTruthy();
  });

  it('erkennt Manipulation am Geheimtext und vertauschte Zusatzdaten', async () => {
    const { key } = await createVault(PW, IT);
    const sealed = await sealJson(key, { n: 1 }, 'block-a');
    await expect(openJson(key, sealed, 'block-b')).rejects.toBeTruthy();
    const bytes = fromBase64(sealed.ct);
    bytes[0] ^= 1;
    const tampered = { ...sealed, ct: btoa(String.fromCharCode(...bytes)) };
    await expect(openJson(key, tampered, 'block-a')).rejects.toBeTruthy();
  });

  it('nutzt für jede Verschlüsselung einen neuen IV', async () => {
    const { key } = await createVault(PW, IT);
    const a = await sealJson(key, { n: 1 }, 'x');
    const b = await sealJson(key, { n: 1 }, 'x');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('Passwortwechsel: altes Passwort ungültig, Daten bleiben lesbar', async () => {
    const { header, key } = await createVault(PW, IT);
    const sealed = await sealJson(key, { n: 42 }, 'x');
    const h2 = await changePassword(header, PW, 'ein-ganz-neues-passwort', IT);
    await expect(unlockVault(h2, PW)).rejects.toBeInstanceOf(WrongPasswordError);
    const k2 = await unlockVault(h2, 'ein-ganz-neues-passwort');
    expect(await openJson(k2, sealed, 'x')).toEqual({ n: 42 });
  });
});

describe('Sicherungsdatei', () => {
  it('enthält keinen Klartext und lässt sich wiederherstellen', async () => {
    const { header, key } = await createVault(PW, IT);
    const text = await buildBackup(header, key, sample());
    expect(text).not.toMatch(/Huber|Lena|Klasse/);
    const restored = await openBackup(parseBackup(text), PW);
    expect(restored.data).toEqual(sample());
  });

  it('meldet falsches Passwort und beschädigte Dateien', async () => {
    const { header, key } = await createVault(PW, IT);
    const text = await buildBackup(header, key, sample());
    await expect(openBackup(parseBackup(text), 'nicht-das-richtige')).rejects.toBeInstanceOf(WrongPasswordError);
    expect(() => parseBackup('{"hallo":1}')).toThrow(InvalidBackupError);
    const f = parseBackup(text);
    const ct = fromBase64(f.data.ct);
    ct[5] ^= 0xff;
    f.data.ct = btoa(String.fromCharCode(...ct));
    await expect(openBackup(f, PW)).rejects.toBeInstanceOf(InvalidBackupError);
  });
});
