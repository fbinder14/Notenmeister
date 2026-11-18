/** Ausgeschriebene Klassennamen, damit Tailwind sie beim Build findet. */
export const GRADE_CLASS: Record<number, string> = {
  1: 'g-1',
  2: 'g-2',
  3: 'g-3',
  4: 'g-4',
  5: 'g-5',
  6: 'g-6',
};

export const GRADE_BAR: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-teal-500',
  3: 'bg-sky-500',
  4: 'bg-amber-500',
  5: 'bg-orange-500',
  6: 'bg-rose-500',
};

export const SUBJECT_DOT: Record<string, string> = {
  indigo: 'bg-indigo-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  orange: 'bg-orange-500',
  slate: 'bg-slate-500',
};

export const SUBJECT_TINT: Record<string, string> = {
  indigo: 'from-indigo-500/15 to-indigo-500/0 text-indigo-700 dark:text-indigo-300',
  sky: 'from-sky-500/15 to-sky-500/0 text-sky-700 dark:text-sky-300',
  emerald: 'from-emerald-500/15 to-emerald-500/0 text-emerald-700 dark:text-emerald-300',
  amber: 'from-amber-500/15 to-amber-500/0 text-amber-700 dark:text-amber-300',
  rose: 'from-rose-500/15 to-rose-500/0 text-rose-700 dark:text-rose-300',
  violet: 'from-violet-500/15 to-violet-500/0 text-violet-700 dark:text-violet-300',
  teal: 'from-teal-500/15 to-teal-500/0 text-teal-700 dark:text-teal-300',
  orange: 'from-orange-500/15 to-orange-500/0 text-orange-700 dark:text-orange-300',
  slate: 'from-slate-500/15 to-slate-500/0 text-slate-700 dark:text-slate-300',
};

/**
 * Dezente Zwei-Ton-Verläufe für die Kacheln „Meine Unterrichte“: Fläche (`bg`),
 * weicher Lichtfleck oben rechts (`orb`) und Akzentfarbe für Kürzel (`text`).
 */
export const SUBJECT_GRADIENT: Record<string, { bg: string; orb: string; text: string }> = {
  indigo: { bg: 'from-indigo-500/[0.13] via-violet-400/[0.06] to-sky-300/[0.04]', orb: 'bg-violet-400/25', text: 'text-indigo-700 dark:text-indigo-300' },
  sky: { bg: 'from-sky-500/[0.13] via-cyan-400/[0.06] to-indigo-300/[0.04]', orb: 'bg-cyan-400/25', text: 'text-sky-700 dark:text-sky-300' },
  emerald: { bg: 'from-emerald-500/[0.13] via-teal-400/[0.06] to-lime-300/[0.04]', orb: 'bg-teal-400/25', text: 'text-emerald-700 dark:text-emerald-300' },
  amber: { bg: 'from-amber-500/[0.14] via-orange-400/[0.06] to-yellow-300/[0.04]', orb: 'bg-orange-300/30', text: 'text-amber-700 dark:text-amber-300' },
  rose: { bg: 'from-rose-500/[0.13] via-pink-400/[0.06] to-orange-300/[0.04]', orb: 'bg-pink-400/25', text: 'text-rose-700 dark:text-rose-300' },
  violet: { bg: 'from-violet-500/[0.13] via-fuchsia-400/[0.06] to-indigo-300/[0.04]', orb: 'bg-fuchsia-400/25', text: 'text-violet-700 dark:text-violet-300' },
  teal: { bg: 'from-teal-500/[0.13] via-emerald-400/[0.06] to-cyan-300/[0.04]', orb: 'bg-cyan-400/25', text: 'text-teal-700 dark:text-teal-300' },
  orange: { bg: 'from-orange-500/[0.13] via-amber-400/[0.06] to-rose-300/[0.04]', orb: 'bg-amber-300/30', text: 'text-orange-700 dark:text-orange-300' },
  slate: { bg: 'from-slate-500/[0.12] via-slate-400/[0.05] to-sky-300/[0.03]', orb: 'bg-slate-400/25', text: 'text-slate-700 dark:text-slate-300' },
};
