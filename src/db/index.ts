import type { Schuljahr, Klasse, Fach, Schueler, Notenspalte, Note } from '@/types';
import { readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

const DATA_FILE = 'notenmeister-data.json';

export interface DBData {
  schuljahre: Schuljahr[];
  klassen: Klasse[];
  faecher: Fach[];
  schueler: Schueler[];
  notenspalten: Notenspalte[];
  noten: Note[];
}

const defaultData: DBData = {
  schuljahre: [],
  klassen: [],
  faecher: [],
  schueler: [],
  notenspalten: [],
  noten: [],
};

export async function loadData(): Promise<DBData> {
  try {
    // Prüfe ob die Datei existiert
    const fileExists = await exists(DATA_FILE, { baseDir: BaseDirectory.AppData });

    if (fileExists) {
      const content = await readTextFile(DATA_FILE, { baseDir: BaseDirectory.AppData });
      return JSON.parse(content) as DBData;
    }
  } catch (e) {
    console.error('Fehler beim Laden der Daten:', e);
  }
  return { ...defaultData };
}

export async function saveData(data: DBData): Promise<void> {
  try {
    // Stelle sicher, dass das Verzeichnis existiert
    const dirExists = await exists('', { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true });
    }

    await writeTextFile(DATA_FILE, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.error('Fehler beim Speichern der Daten:', e);
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}
