<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { entriesFor, formatAvg, summarize, type Ctx } from '../lib/domain/grading';
  import { findClass, fmtDate, STATUS_LABEL, subjectOf, typeById, yearOf } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { Course, Grade } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import { SUBJECT_DOT } from '../ui/colors';

  let { classId, studentId }: { classId: string; studentId: string } = $props();
  const cls = $derived(findClass(classId));
  const s = $derived(cls?.students.find((x) => x.id === studentId));
  const year = $derived(cls ? yearOf(cls) : undefined);
  const ctx = $derived<Ctx | null>(year ? { types: new Map(app.core.types.map((t) => [t.id, t])), year } : null);
  const courses = $derived(cls ? cls.courses.filter((c) => !c.excludedStudentIds.includes(studentId)) : []);

  function list(c: Course): Array<{ g: Grade; date: string; name: string; weight: number }> {
    const byId = new Map(c.assessments.map((a) => [a.id, a]));
    return c.grades
      .filter((g) => g.studentId === studentId)
      .map((g) => {
        const a = g.assessmentId ? byId.get(g.assessmentId) : undefined;
        const t = typeById(a ? a.typeId : g.typeId);
        return {
          g,
          date: a ? a.date : g.performedAt.slice(0, 10),
          name: a ? a.title : `${t?.name ?? 'Note'}${g.title ? ` · ${g.title}` : ''}`,
          weight: a ? (a.weight ?? t?.weight ?? 1) : (g.weight ?? t?.weight ?? 1),
        };
      })
      .sort((x, y) => x.date.localeCompare(y.date));
  }

  function report(c: Course, term: 'zwischen' | 'jahr') {
    return c.reportGrades.find((r) => r.studentId === studentId && r.term === term)?.value ?? null;
  }
</script>

{#if !cls || !s || !ctx}
  <div class="p-8"><Empty icon="users" title="Nicht gefunden" /></div>
{:else}
  <PageHeader title="{s.firstName} {s.lastName}" eyebrow="Klasse {cls.name} · Notenbogen {year?.name}" back={href.cls(cls.id)}>
    {#snippet actions()}
      <button class="btn btn-soft" onclick={() => print()}><Icon name="print" size={15} /> Drucken / PDF</button>
    {/snippet}
  </PageHeader>

  <div class="mx-auto grid max-w-5xl gap-5 px-8 py-7">
    <div class="print-only mb-2">
      <h1 class="text-[16pt] font-semibold">Notenbogen {s.lastName}, {s.firstName}</h1>
      <p>Klasse {cls.name} · Schuljahr {year?.name} · Stand {new Date().toLocaleString('de-DE')}</p>
    </div>
    {#if s.support}
      <div class="rounded-xl bg-violet-50 px-4 py-2.5 text-[13px] text-violet-800 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/20">{s.support}</div>
    {/if}
    {#each courses as c (c.id)}
      {@const subj = subjectOf(c)}
      {@const h1 = summarize(entriesFor(c, s.id, ctx, 1))}
      {@const all = summarize(entriesFor(c, s.id, ctx, 'jahr'))}
      <section class="card overflow-hidden" style="break-inside: avoid">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-line-dark">
          <a href={href.course(cls.id, c.id)} class="flex items-center gap-2.5 text-[15px] font-semibold hover:text-brand-600">
            <span class="h-2.5 w-2.5 rounded-full {SUBJECT_DOT[subj?.color ?? 'slate']}"></span>{subj?.name}
          </a>
          <div class="flex gap-5 text-[12px] text-slate-500">
            <span>1. Hj. <b class="tabular-nums text-slate-800 dark:text-slate-100">{formatAvg(h1.total)}</b></span>
            <span>Schuljahr <b class="tabular-nums text-slate-800 dark:text-slate-100">{formatAvg(all.total)}</b></span>
            <span class="flex items-center gap-1">ZZ <GradeBadge value={report(c, 'zwischen')} size="sm" />{#if !report(c, 'zwischen')}–{/if}</span>
            <span class="flex items-center gap-1">JZ <GradeBadge value={report(c, 'jahr')} size="sm" />{#if !report(c, 'jahr')}–{/if}</span>
          </div>
        </div>
        {#if list(c).length}
          <table class="w-full text-[13px]">
            <tbody>
              {#each list(c) as row (row.g.id)}
                <tr class="border-t border-slate-100 first:border-t-0 dark:border-line-dark">
                  <td class="w-24 px-5 py-1.5 tabular-nums text-slate-500">{fmtDate(row.date)}</td>
                  <td class="px-2 py-1.5">{row.name}</td>
                  <td class="w-16 px-2 py-1.5 text-center text-[12px] text-slate-400">×{row.weight}</td>
                  <td class="w-14 px-2 py-1.5 text-center"><GradeBadge value={row.g.value} status={row.g.status} size="sm" /></td>
                  <td class="px-5 py-1.5 text-[12px] text-slate-500">
                    {row.g.status !== 'gewertet' ? STATUS_LABEL[row.g.status] : ''}{row.g.comment ? `${row.g.status !== 'gewertet' ? ' · ' : ''}${row.g.comment}` : ''}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="px-5 py-4 text-[13px] text-slate-400">Noch keine Noten.</p>
        {/if}
      </section>
    {:else}
      <Empty icon="book" title="Keine Kurse" />
    {/each}
  </div>
{/if}
