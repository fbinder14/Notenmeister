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
