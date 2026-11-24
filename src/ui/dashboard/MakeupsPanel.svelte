<script lang="ts">
  import { openMakeups, relativeDays } from '../../lib/domain/dashboard';
  import { fmtShortDate, subjectOf, typeById } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';
  import ProtectedPanel from '../ProtectedPanel.svelte';

  /** Offene Nachtermine (RSO § 22) und fehlende Ersatznoten – verdeckt, da mit Namen. */
  let { classes, today }: { classes: SchoolClass[]; today: string } = $props();

  /** Ab so vielen Tagen gilt ein Nachtermin als überfällig. */
  const LATE_DAYS = 14;

  const items = $derived(openMakeups(classes, today));
  const late = $derived(items.filter((x) => x.age >= LATE_DAYS).length);
  const makeups = $derived(items.filter((x) => x.kind === 'nachtermin').length);
  const replacements = $derived(items.length - makeups);
  const lockedTitle = $derived(
    [makeups ? `${makeups} Nachtermin${makeups === 1 ? '' : 'e'}` : '', replacements ? `${replacements} Ersatznote${replacements === 1 ? '' : 'n'}` : '']
      .filter(Boolean)
      .join(' · ') + ' offen',
  );
</script>

<ProtectedPanel
  id="nachtermine"
  title="Nachtermine und Ersatznoten"
  count={items.length}
  {lockedTitle}
  lockedText={late ? `${late} davon länger als ${LATE_DAYS} Tage offen. Aus Datenschutzgründen verdeckt.` : undefined}
  empty="Keine offenen Nachtermine oder Ersatznoten."
>
  {#each items as { cls, course, student, grade, assessment: a, kind, since, age } (grade.id)}
    <a
      href={a ? href.assessment(cls.id, course.id, a.id) : href.student(cls.id, student.id)}
      class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-2.5 transition first:border-t-0 hover:bg-slate-50 dark:border-line-dark dark:hover:bg-white/[0.03]"
    >
      <span class="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Icon name="clock" size={14} stroke={2} /></span>
      <div class="min-w-0">
        <div class="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{student.lastName}, {student.firstName}</div>
        <div class="truncate text-[0.71875rem] text-slate-500">
          {kind === 'ersatz' ? 'Ersatznote für' : 'Nachtermin'}
          {typeById(a?.typeId ?? grade.typeId)?.short}{a ? ` „${a.title}“` : ''} vom {fmtShortDate(since)} · {cls.name} {subjectOf(course)?.short}
        </div>
      </div>
      <span class="text-[0.71875rem] tabular-nums {age >= LATE_DAYS ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-slate-400'}">{relativeDays(-age)}</span>
    </a>
  {/each}
</ProtectedPanel>
