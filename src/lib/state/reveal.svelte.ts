/**
 * Zeitlich begrenztes Einblenden geschützter Inhalte auf der Startseite.
 * Nach `seconds` Sekunden, beim Verlassen des Fensters oder beim Wechsel des
 * Tabs wird wieder verdeckt. `attach()` in einem `$effect` aufrufen.
 */
export class Reveal {
  open = $state(false);
  left = $state(0);
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly seconds = 60,
    private onhide?: () => void,
  ) {
    this.left = seconds;
  }

  show = () => {
    this.open = true;
    this.left = this.seconds;
    this.#stop();
    this.#timer = setInterval(() => {
      this.left--;
      if (this.left <= 0) this.hide();
    }, 1000);
  };

  hide = () => {
    this.open = false;
    this.#stop();
    this.onhide?.();
  };

  #stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
  }

  /** Bindet die Ereignisse; die zurückgegebene Funktion räumt auf. */
  attach() {
    const onvisibility = () => document.visibilityState === 'hidden' && this.hide();
    addEventListener('blur', this.hide);
    document.addEventListener('visibilitychange', onvisibility);
    return () => {
      removeEventListener('blur', this.hide);
      document.removeEventListener('visibilitychange', onvisibility);
      this.#stop();
    };
  }
}
