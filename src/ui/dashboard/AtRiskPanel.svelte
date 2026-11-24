<script lang="ts">
  import { atRisk, RISK_AVG } from '../../lib/domain/dashboard';
  import { formatAvg, type Ctx } from '../../lib/domain/grading';
  import { subjectOf } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';
  import ProtectedPanel from '../ProtectedPanel.svelte';

  /**
   * Schülerinnen und Schüler mit Handlungsbedarf: Schnitt ab 4,5 oder – ab der
   * Mitte des Halbjahres – zu wenige kleine Leistungsnachweise. Verdeckt.
   */
  let { classes, ctx, today }: { classes: SchoolClass[]; ctx: Ctx; today: string } = $props();

  const PAGE = 8;
  let more = $state(false);

  const items = $derived(atRisk(classes, ctx, today));
  const risky = $derived(items.filter((x) => x.reasons.includes('schnitt')).length);
  const few = $derived(items.length - risky);
</script>

<ProtectedPanel
  id="handlungsbedarf"
  title="Handlungsbedarf"
  count={items.length}
  lockedTitle={[risky ? `${risky} gefährdet` : '', few ? `${few} mit zu wenigen Noten` : ''].filter(Boolean).join(' · ')}
  empty="Niemand mit Schnitt ab {formatAvg(RISK_AVG)} und keine auffälligen Lücken bei den kleinen Leistungsnachweisen."
>
  {#each items.slice(0, more ? items.length : PAGE) as { cls, course, student, avg, reasons, small, minSmall } (`${course.id}-${student.id}`)}
    {@const bad = reasons.includes('schnitt')}
    <a
      href={href.student(cls.id, student.id)}
      class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-2.5 transition first:border-t-0 hover:bg-slate-50 dark:border-line-dark dark:hover:bg-white/[0.03]"
    >
      <span
        class="grid h-7 w-7 place-items-center rounded-lg {bad
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
          : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'}"
      >
        <Icon name={bad ? 'alert' : 'list'} size={14} stroke={2} />
      </span>
      <div class="min-w-0">
        <div class="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{student.lastName}, {student.firstName}</div>
        <div class="truncate text-[0.71875rem] text-slate-500">
          {cls.name} {subjectOf(course)?.short}
          {#if reasons.includes('wenige')} · {small} von {minSmall} kleinen Noten im Halbjahr{/if}
        </div>
      </div>
      <span class="text-[0.8125rem] font-semibold tabular-nums {bad ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}">Ø {formatAvg(avg)}</span>
    </a>
  {/each}
  {#if items.length > PAGE}
    <div class="border-t border-slate-100 px-4 py-2 dark:border-line-dark">
      <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={() => (more = !more)}>{more ? 'Weniger' : `Alle anzeigen (${items.length})`}</button>
    </div>
  {/if}
</ProtectedPanel>
