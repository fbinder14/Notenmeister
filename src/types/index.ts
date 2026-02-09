export interface Schuljahr {
  id: string;
  name: string; // z.B. "2024/25"
  aktiv: boolean;
  erstelltAm: string;
}

export interface Klasse {
  id: string;
  schuljahrId: string;
  name: string; // z.B. "10a"
  erstelltAm: string;
}

export interface Fach {
  id: string;
  klasseId: string;
  name: string; // z.B. "Mathematik"
  erstelltAm: string;
}

export interface Schueler {
  id: string;
  fachId: string;
  vorname: string;
  nachname: string;
  erstelltAm: string;
}

export type NotenspaltenTyp = 'schulaufgabe' | 'stegreifaufgabe' | 'muendlich' | 'sonstiges';

export interface Notenspalte {
  id: string;
  fachId: string;
visibleName: string; // z.B. "1. Schulaufgabe"
  typ: NotenspaltenTyp;
  gewichtung: number; // z.B. 2 für doppelte Gewichtung
  erstelltAm: string;
}

export interface Note {
  id: string;
  schuelerId: string;
  notenspalteId: string;
  wert: number; // 1-6
  datum: string;
  kommentar: string;
  erstelltAm: string;
}

export interface SchuelerMitNoten extends Schueler {
  noten: Note[];
  durchschnitt: number | null;
}
