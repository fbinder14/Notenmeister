<script lang="ts">
  import { canRestore, fmtDateTime, purgeTrash, restoreGrade, typeById } from '../lib/state/actions';
  import { toast } from '../lib/state/toast.svelte';
  import type { Course, DeletedGrade, SchoolClass } from '../lib/domain/types';
  import GradeBadge from './GradeBadge.svelte';
  import Icon from './Icon.svelte';

  /** Gelöschte Noten eines Unterrichts: nachvollziehbar mit Zeitpunkten, wiederherstellbar. */
  let { cls, course }: { cls: SchoolClass; course: Course } = $props();

  let open = $state(false);
  let confirm = $state<DeletedGrade | 'all' | null>(null);

  const items = $derived((cls.trash ?? []).filter((d) => d.courseId === course.id).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)));

  function name(id: string): string {
    const s = cls.students.find((x) => x.id === id);
    return s ? `${s.lastName}, ${s.firstName}` : 'gelöschte Person';
  }

  function what(d: DeletedGrade): string {
    if (d.grade.assessmentId) {
      const a = course.assessments.find((x) => x.id === d.grade.assessmentId);
      return a?.title ?? d.assessmentTitle ?? 'Leistungsnachweis';
    }
    return `${typeById(d.grade.typeId)?.name ?? 'Einzelnote'}${d.grade.title ? ` · ${d.grade.title}` : ''}`;
  }

  function restore(d: DeletedGrade) {
    if (restoreGrade(cls, d)) toast.success('Note wiederhergestellt.');
  }

  function purge(d: DeletedGrade | 'all') {
    if (confirm !== d) {
      confirm = d;
      return;
    }
    if (d === 'all') for (const x of items) purgeTrash(cls, x);
    else purgeTrash(cls, d);
    confirm = null;
  }
</script>

{#if items.length}
  <section class="mt-7 max-w-4xl">
    <button class="mb-3 flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onclick={() => (open = !open)}>
      <Icon name="chevron" size={14} class="transition {open ? 'rotate-90' : ''}" />
      <Icon name="trash" size={14} /> Gelöschte Noten · {items.length}
    </button>
    {#if open}
      <div class="card overflow-x-auto">
        <table class="w-full whitespace-nowrap text-[0.78125rem]">
          <thead class="text-left text-[0.6875rem] uppercase tracking-wider text-slate-400">
            <tr>
              <th class="px-4 py-2 font-semibold">Gelöscht am</th>
              <th class="px-2 py-2 font-semibold">Name</th>
              <th class="px-2 py-2 font-semibold">Note</th>
              <th class="px-2 py-2 font-semibold">Leistung</th>
              <th class="px-2 py-2 font-semibold">Erfasst am</th>
              <th class="w-48"></th>
            </tr>
          </thead>
          <tbody>
            {#each items as d (d.grade.id + d.deletedAt)}
              {@const ok = canRestore(cls, d)}
              <tr class="border-t border-slate-100 dark:border-line-dark">
                <td class="px-4 py-2 tabular-nums text-slate-500">{fmtDateTime(d.deletedAt)}</td>
                <td class="px-2 py-2 font-medium">{name(d.grade.studentId)}</td>
                <td class="px-2 py-2"><GradeBadge value={d.grade.value} status={d.grade.status} size="sm" /></td>
                <td class="px-2 py-2 text-slate-600 dark:text-slate-300">
                  {what(d)}{#if d.withAssessment}<span class="text-slate-400"> (mit Nachweis gelöscht)</span>{/if}
                  {#if d.grade.history.length}<span class="text-slate-400"> · {d.grade.history.length}× geändert</span>{/if}
                </td>
                <td class="px-2 py-2 tabular-nums text-slate-500">{fmtDateTime(d.grade.recordedAt)}</td>
                <td class="px-2 py-1.5 text-right">
                  <button
                    class="btn btn-ghost h-7 px-2 text-[0.75rem]"
                    disabled={!ok}
                    title={ok ? 'Note wieder eintragen' : 'Nicht möglich: Nachweis gelöscht oder bereits neu benotet'}
                    onclick={() => restore(d)}>Wiederherstellen</button
                  >
                  <button class="btn h-7 px-2 text-[0.75rem] {confirm === d ? 'btn-danger' : 'btn-ghost'}" onclick={() => purge(d)} title="Endgültig entfernen">
                    {#if confirm === d}Endgültig?{:else}<Icon name="x" size={13} />{/if}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="flex items-center gap-2 border-t border-slate-100 px-4 py-2 dark:border-line-dark">
          <span class="min-w-48 flex-1 text-[0.6875rem] text-slate-400">Gelöschte Noten bleiben mit ihrem Verlauf erhalten, bis du sie hier endgültig entfernst oder die Klasse löschst.</span>
          <button class="btn h-7 px-2 text-[0.75rem] {confirm === 'all' ? 'btn-danger' : 'btn-ghost'}" onclick={() => purge('all')}>
            <Icon name="trash" size={13} /> {confirm === 'all' ? 'Wirklich alle entfernen?' : 'Papierkorb leeren'}
          </button>
        </div>
      </div>
    {/if}
  </section>
{/if}
