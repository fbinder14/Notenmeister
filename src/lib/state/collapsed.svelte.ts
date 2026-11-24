/**
 * Eingeklappte Fenster der Startseite. Gespeichert wird unverschlüsselt im
 * Browser (localStorage), wie die Schriftgröße: Es sind nur Kennungen der
 * Fenster, keine schützenswerten Daten.
 */

const KEY = 'notenmeister.collapsed';

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  } catch {
    // Speicher gesperrt oder unlesbar: alles ausgeklappt.
  }
  return [];
}

class CollapsedState {
  #ids = $state<string[]>(read());

  has(id: string): boolean {
    return this.#ids.includes(id);
  }

  toggle(id: string) {
    this.#ids = this.has(id) ? this.#ids.filter((x) => x !== id) : [...this.#ids, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(this.#ids));
    } catch {
      // Nicht speicherbar: gilt dann nur bis zum Neuladen.
    }
  }
}

export const collapsed = new CollapsedState();
