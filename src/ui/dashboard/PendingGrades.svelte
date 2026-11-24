<script lang="ts">
  import { pendingGrading, relativeDays } from '../../lib/domain/dashboard';
  import { subjectOf, typeById } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';
  import Widget from '../Widget.svelte';

  /** Vergangene Leistungsnachweise, bei denen noch Noten fehlen. Enthält keine Namen. */
  let { classes, today }: { classes: SchoolClass[]; today: string } = $props();

  const pending = $derived(pendingGrading(classes, today));
</script>

{#if pending.length}
  <Widget id="noten-fehlen" title="Noten fehlen noch" badge={pending.length}>
    <div class="card divide-y divide-slate-100 dark:divide-line-dark">
      {#each pending as { cls, course, assessment: a, entered, total, age } (a.id)}
        <a href={href.assessment(cls.id, course.id, a.id)} class="flex items-center gap-4 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"><Icon name="edit" size={14} stroke={2} /></span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[0.8125rem] font-medium">{typeById(a.typeId)?.short} „{a.title}“ · {cls.name} {subjectOf(course)?.short}</div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                <div class="h-full rounded-full bg-amber-500" style="width: {(entered / total) * 100}%"></div>
              </div>
              <span class="text-[0.71875rem] tabular-nums text-slate-500">{entered} von {total} eingetragen · {relativeDays(-age)}</span>
            </div>
          </div>
          <Icon name="chevron" size={16} class="text-slate-300" />
        </a>
      {/each}
    </div>
  </Widget>
{/if}
