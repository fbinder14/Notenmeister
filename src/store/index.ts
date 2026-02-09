import { create } from 'zustand';
import { loadData, saveData, generateId, getCurrentDate, type DBData } from '@/db';
import type { Schuljahr, Klasse, Fach, Schueler, Notenspalte, Note, NotenspaltenTyp } from '@/types';

interface AppState extends DBData {
  aktuellesSchuljahrId: string | null;
  aktuelleKlasseId: string | null;
  aktuellesFachId: string | null;
  isLoading: boolean;

  init: () => Promise<void>;

  addSchuljahr: (name: string) => void;
  setAktivesSchuljahr: (id: string) => void;
  deleteSchuljahr: (id: string) => void;

  addKlasse: (name: string) => void;
  updateKlasse: (id: string, name: string) => void;
  deleteKlasse: (id: string) => void;
  setAktuelleKlasse: (id: string | null) => void;

  addFach: (name: string) => void;
  updateFach: (id: string, name: string) => void;
  deleteFach: (id: string) => void;
  setAktuellesFach: (id: string | null) => void;

  addSchueler: (vorname: string, nachname: string) => void;
  updateSchueler: (id: string, vorname: string, nachname: string) => void;
  deleteSchueler: (id: string) => void;

  addNotenspalte: (name: string, typ: NotenspaltenTyp, gewichtung: number) => void;
  updateNotenspalte: (id: string, name: string, typ: NotenspaltenTyp, gewichtung: number) => void;
  deleteNotenspalte: (id: string) => void;

  addNote: (schuelerId: string, notenspalteId: string, wert: number, datum: string, kommentar: string) => void;
  updateNote: (id: string, wert: number, datum: string, kommentar: string) => void;
  deleteNote: (id: string) => void;

  berechneSchuelerDurchschnitt: (schuelerId: string) => number | null;
}

const persistState = (state: AppState) => {
  const data: DBData = {
    schuljahre: state.schuljahre,
    klassen: state.klassen,
    faecher: state.faecher,
    schueler: state.schueler,
    notenspalten: state.notenspalten,
    noten: state.noten,
  };
  saveData(data);
};

export const useStore = create<AppState>((set, get) => ({
  schuljahre: [],
  klassen: [],
  faecher: [],
  schueler: [],
  notenspalten: [],
  noten: [],
  aktuellesSchuljahrId: null,
  aktuelleKlasseId: null,
  aktuellesFachId: null,
  isLoading: true,

  init: async () => {
    const data = await loadData();
    const aktivesSchuljahr = data.schuljahre.find(s => s.aktiv);
    set({
      ...data,
      aktuellesSchuljahrId: aktivesSchuljahr?.id ?? null,
      isLoading: false,
    });
  },

  addSchuljahr: (name) => {
    const state = get();
    const neuesSchuljahr: Schuljahr = {
      id: generateId(),
      name,
      aktiv: state.schuljahre.length === 0,
      erstelltAm: getCurrentDate(),
    };
    const schuljahre = [...state.schuljahre, neuesSchuljahr];
    const newState = { ...state, schuljahre };
    if (neuesSchuljahr.aktiv) {
      newState.aktuellesSchuljahrId = neuesSchuljahr.id;
    }
    set(newState);
    persistState({ ...get() });
  },

  setAktivesSchuljahr: (id) => {
    const state = get();
    const schuljahre = state.schuljahre.map(s => ({
      ...s,
      aktiv: s.id === id,
    }));
    set({ schuljahre, aktuellesSchuljahrId: id, aktuelleKlasseId: null, aktuellesFachId: null });
    persistState({ ...get() });
  },

  deleteSchuljahr: (id) => {
    const state = get();
    const schuljahre = state.schuljahre.filter(s => s.id !== id);
    const klassenIds = state.klassen.filter(k => k.schuljahrId === id).map(k => k.id);
    const klassen = state.klassen.filter(k => k.schuljahrId !== id);
    const faecherIds = state.faecher.filter(f => klassenIds.includes(f.klasseId)).map(f => f.id);
    const faecher = state.faecher.filter(f => !klassenIds.includes(f.klasseId));
    const schuelerIds = state.schueler.filter(s => faecherIds.includes(s.fachId)).map(s => s.id);
    const schueler = state.schueler.filter(s => !faecherIds.includes(s.fachId));
    const notenspaltenIds = state.notenspalten.filter(n => faecherIds.includes(n.fachId)).map(n => n.id);
    const notenspalten = state.notenspalten.filter(n => !faecherIds.includes(n.fachId));
    const noten = state.noten.filter(n => !schuelerIds.includes(n.schuelerId) && !notenspaltenIds.includes(n.notenspalteId));

    set({
      schuljahre,
      klassen,
      faecher,
      schueler,
      notenspalten,
      noten,
      aktuellesSchuljahrId: state.aktuellesSchuljahrId === id ? (schuljahre[0]?.id ?? null) : state.aktuellesSchuljahrId,
      aktuelleKlasseId: null,
      aktuellesFachId: null,
    });
    persistState({ ...get() });
  },

  addKlasse: (name) => {
    const state = get();
    if (!state.aktuellesSchuljahrId) return;

    const neueKlasse: Klasse = {
      id: generateId(),
      schuljahrId: state.aktuellesSchuljahrId,
      name,
      erstelltAm: getCurrentDate(),
    };
    set({ klassen: [...state.klassen, neueKlasse] });
    persistState({ ...get() });
  },

  updateKlasse: (id, name) => {
    const state = get();
    const klassen = state.klassen.map(k => k.id === id ? { ...k, name } : k);
    set({ klassen });
    persistState({ ...get() });
  },

  deleteKlasse: (id) => {
    const state = get();
    const klassen = state.klassen.filter(k => k.id !== id);
    const faecherIds = state.faecher.filter(f => f.klasseId === id).map(f => f.id);
    const faecher = state.faecher.filter(f => f.klasseId !== id);
    const schuelerIds = state.schueler.filter(s => faecherIds.includes(s.fachId)).map(s => s.id);
    const schueler = state.schueler.filter(s => !faecherIds.includes(s.fachId));
    const notenspaltenIds = state.notenspalten.filter(n => faecherIds.includes(n.fachId)).map(n => n.id);
    const notenspalten = state.notenspalten.filter(n => !faecherIds.includes(n.fachId));
    const noten = state.noten.filter(n => !schuelerIds.includes(n.schuelerId) && !notenspaltenIds.includes(n.notenspalteId));

    set({
      klassen,
      faecher,
      schueler,
      notenspalten,
      noten,
      aktuelleKlasseId: state.aktuelleKlasseId === id ? null : state.aktuelleKlasseId,
      aktuellesFachId: null,
    });
    persistState({ ...get() });
  },

  setAktuelleKlasse: (id) => {
    set({ aktuelleKlasseId: id, aktuellesFachId: null });
  },

  addFach: (name) => {
    const state = get();
    if (!state.aktuelleKlasseId) return;

    const neuesFach: Fach = {
      id: generateId(),
      klasseId: state.aktuelleKlasseId,
      name,
      erstelltAm: getCurrentDate(),
    };
    set({ faecher: [...state.faecher, neuesFach] });
    persistState({ ...get() });
  },

  updateFach: (id, name) => {
    const state = get();
    const faecher = state.faecher.map(f => f.id === id ? { ...f, name } : f);
    set({ faecher });
    persistState({ ...get() });
  },

  deleteFach: (id) => {
    const state = get();
    const faecher = state.faecher.filter(f => f.id !== id);
    const schuelerIds = state.schueler.filter(s => s.fachId === id).map(s => s.id);
    const schueler = state.schueler.filter(s => s.fachId !== id);
    const notenspaltenIds = state.notenspalten.filter(n => n.fachId === id).map(n => n.id);
    const notenspalten = state.notenspalten.filter(n => n.fachId !== id);
    const noten = state.noten.filter(n => !schuelerIds.includes(n.schuelerId) && !notenspaltenIds.includes(n.notenspalteId));

    set({
      faecher,
      schueler,
      notenspalten,
      noten,
      aktuellesFachId: state.aktuellesFachId === id ? null : state.aktuellesFachId,
    });
    persistState({ ...get() });
  },

  setAktuellesFach: (id) => {
    set({ aktuellesFachId: id });
  },

  addSchueler: (vorname, nachname) => {
    const state = get();
    if (!state.aktuellesFachId) return;

    const neuerSchueler: Schueler = {
      id: generateId(),
      fachId: state.aktuellesFachId,
      vorname,
      nachname,
      erstelltAm: getCurrentDate(),
    };
    set({ schueler: [...state.schueler, neuerSchueler] });
    persistState({ ...get() });
  },

  updateSchueler: (id, vorname, nachname) => {
    const state = get();
    const schueler = state.schueler.map(s => s.id === id ? { ...s, vorname, nachname } : s);
    set({ schueler });
    persistState({ ...get() });
  },

  deleteSchueler: (id) => {
    const state = get();
    const schueler = state.schueler.filter(s => s.id !== id);
    const noten = state.noten.filter(n => n.schuelerId !== id);
    set({ schueler, noten });
    persistState({ ...get() });
  },

  addNotenspalte: (name, typ, gewichtung) => {
    const state = get();
    if (!state.aktuellesFachId) return;

    const neueNotenspalte: Notenspalte = {
      id: generateId(),
      fachId: state.aktuellesFachId,
      visibleName: name,
      typ,
      gewichtung,
      erstelltAm: getCurrentDate(),
    };
    set({ notenspalten: [...state.notenspalten, neueNotenspalte] });
    persistState({ ...get() });
  },

  updateNotenspalte: (id, name, typ, gewichtung) => {
    const state = get();
    const notenspalten = state.notenspalten.map(n =>
      n.id === id ? { ...n, visibleName: name, typ, gewichtung } : n
    );
    set({ notenspalten });
    persistState({ ...get() });
  },

  deleteNotenspalte: (id) => {
    const state = get();
    const notenspalten = state.notenspalten.filter(n => n.id !== id);
    const noten = state.noten.filter(n => n.notenspalteId !== id);
    set({ notenspalten, noten });
    persistState({ ...get() });
  },

  addNote: (schuelerId, notenspalteId, wert, datum, kommentar) => {
    const state = get();
    const neueNote: Note = {
      id: generateId(),
      schuelerId,
      notenspalteId,
      wert,
      datum,
      kommentar,
      erstelltAm: getCurrentDate(),
    };
    set({ noten: [...state.noten, neueNote] });
    persistState({ ...get() });
  },

  updateNote: (id, wert, datum, kommentar) => {
    const state = get();
    const noten = state.noten.map(n =>
      n.id === id ? { ...n, wert, datum, kommentar } : n
    );
    set({ noten });
    persistState({ ...get() });
  },

  deleteNote: (id) => {
    const state = get();
    const noten = state.noten.filter(n => n.id !== id);
    set({ noten });
    persistState({ ...get() });
  },

  berechneSchuelerDurchschnitt: (schuelerId) => {
    const state = get();
    const schuelerNoten = state.noten.filter(n => n.schuelerId === schuelerId);

    if (schuelerNoten.length === 0) return null;

    let summe = 0;
    let gewichtungsSumme = 0;

    for (const note of schuelerNoten) {
      const spalte = state.notenspalten.find(s => s.id === note.notenspalteId);
      if (spalte) {
        summe += note.wert * spalte.gewichtung;
        gewichtungsSumme += spalte.gewichtung;
      }
    }

    if (gewichtungsSumme === 0) return null;

    return Math.round((summe / gewichtungsSumme) * 100) / 100;
  },
}));
