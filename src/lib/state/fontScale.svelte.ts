/**
 * Schriftgröße der ganzen App. Alle Größen sind in rem angegeben, deshalb reicht
 * es, die Grundschrift von <html> zu ändern.
 *
 * Gespeichert wird unverschlüsselt im Browser (localStorage), damit schon der
 * Entsperren-Bildschirm in der gewählten Größe erscheint. Die Wahl ist eine
 * Geräte-Vorliebe und enthält keine schützenswerten Daten.
 */

export type FontScale = 'kompakt' | 'standard' | 'gross' | 'sehrgross';

const KEY = 'notenmeister.fontScale';

const PERCENT: Record<FontScale, string> = {
  kompakt: '100%',
  standard: '112.5%',
  gross: '125%',
  sehrgross: '137.5%',
};

export const FONT_SCALE_OPTIONS: Array<{ value: FontScale; label: string }> = [
  { value: 'kompakt', label: 'Kompakt' },
  { value: 'standard', label: 'Standard' },
  { value: 'gross', label: 'Groß' },
  { value: 'sehrgross', label: 'Sehr groß' },
];

function read(): FontScale {
  try {
    const v = localStorage.getItem(KEY);
    if (v && v in PERCENT) return v as FontScale;
  } catch {
    // Speicher gesperrt: Standard verwenden.
  }
  return 'standard';
}

function apply(v: FontScale) {
  document.documentElement.style.fontSize = PERCENT[v];
}

class FontScaleState {
  #value = $state<FontScale>(read());

  constructor() {
    apply(this.#value);
  }

  get value() {
    return this.#value;
  }

  set value(v: FontScale) {
    this.#value = v;
    apply(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // Nicht speicherbar: gilt dann nur bis zum Neuladen.
    }
  }
}

export const fontScale = new FontScaleState();
