<script lang="ts">
  import { itemTime, recentLog, type LogItem } from '../lib/domain/logbook';
  import { formatAvg, weightedAverage } from '../lib/domain/grading';
  import { clearLog, NOTE_TOPICS, subjectOf, typeById } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import type { GradeValue, LogEntry, SchoolClass } from '../lib/domain/types';
  import Icon, { type IconName } from './Icon.svelte';
  import GradeBadge from './GradeBadge.svelte';
  import Locked from './Locked.svelte';
  import RevealTimer from './RevealTimer.svelte';
  import { Reveal } from '../lib/state/reveal.svelte';
  import { collapsed } from '../lib/state/collapsed.svelte';
  import Widget from './Widget.svelte';

  /**
   * „Letzte Aktionen“ (Variante A): Der Inhalt ist zunächst verdeckt und wird erst
   * auf Klick für eine Minute eingeblendet. Solange verdeckt, stehen keine
   * echten Daten im Dokument – nur Platzhalter. Verlässt man das Fenster oder
   * die Startseite, wird sofort wieder verdeckt.
   */
  let { classes }: { classes: SchoolClass[] } = $props();

  const PAGE = 8;

  let more = $state(false);
  let confirmClear = $state(false);
  const reveal = new Reveal(60, () => {
    more = false;
    confirmClear = false;
  });
  $effect(() => reveal.attach());
  // Beim Einklappen sofort wieder verdecken.
  $effect(() => {
    if (collapsed.has('aktionen')) reveal.hide();
  });

  const items = $derived(recentLog(classes));
  const shown = $derived(items.slice(0, more ? 40 : PAGE));
  const sinceYesterday = $derived.by(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    const iso = d.toISOString();
    return items.filter((it) => itemTime(it) >= iso).length;
  });

  function doClear() {
    if (!confirmClear) {
      confirmClear = true;
      return;
    }
    clearLog();
    reveal.hide();
  }

  // ---------- Anzeige ----------

  function dayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === y.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  function studentName(cls: SchoolClass, id: string | undefined): string {
    const s = cls.students.find((x) => x.id === id);
    return s ? `${s.lastName}, ${s.firstName}` : 'gelöschter Eintrag';
  }

  function where(cls: SchoolClass, e: LogEntry): string {
    const course = cls.courses.find((c) => c.id === e.courseId);
    const subj = course ? subjectOf(course)?.short : undefined;
    return [cls.name, subj].filter(Boolean).join(' ');
  }

  function what(cls: SchoolClass, e: LogEntry): string {
    const course = cls.courses.find((c) => c.id === e.courseId);
    const a = course?.assessments.find((x) => x.id === e.assessmentId);
    const t = typeById(a?.typeId ?? e.typeId);
    if (a) return `${t?.short ?? ''} „${a.title}“`.trim();
    if (e.title) return `${t?.short ?? ''} „${e.title}“`.trim();
    return t?.name ?? '';
  }

  function link(cls: SchoolClass, e: LogEntry): string {
    const course = cls.courses.find((c) => c.id === e.courseId);
    if (course && e.assessmentId && course.assessments.some((a) => a.id === e.assessmentId)) return href.assessment(cls.id, course.id, e.assessmentId);
    if (e.studentId && cls.students.some((s) => s.id === e.studentId)) return href.student(cls.id, e.studentId);
    if (course) return href.course(cls.id, course.id);
    return href.cls(cls.id);
  }

  const ICON: Record<string, { icon: IconName; tone: string }> = {
    grade: { icon: 'check', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
    changed: { icon: 'history', tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300' },
    removed: { icon: 'trash', tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' },
    makeup: { icon: 'clock', tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300' },
    assessment: { icon: 'list', tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300' },
    note: { icon: 'edit', tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
    report: { icon: 'award', tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300' },
  };

  function iconOf(it: LogItem) {
    if (it.type === 'group') return ICON.grade;
    const e = it.e;
    switch (e.kind) {
      case 'grade':
        if (e.status === 'nachtermin') return ICON.makeup;
        return e.changed ? ICON.changed : ICON.grade;
      case 'grade_removed':
      case 'assessment_removed':
        return ICON.removed;
      case 'assessment_added':
        return ICON.assessment;
      case 'note_added':
        return ICON.note;
      case 'report_grade':
        return ICON.report;
    }
  }

  function groupAvg(entries: LogEntry[]): string {
    const vals = entries.filter((e) => e.value && e.status !== 'nicht_gewertet' && e.status !== 'nachtermin').map((e) => ({ value: e.value as GradeValue, weight: 1 }));
    return formatAvg(weightedAverage(vals));
  }

  const days = $derived.by(() => {
    const out: Array<{ label: string; items: LogItem[] }> = [];
    for (const it of shown) {
      const label = dayLabel(itemTime(it));
      if (out.at(-1)?.label !== label) out.push({ label, items: [] });
      out.at(-1)!.items.push(it);
    }
    return out;
  });
</script>

<Widget id="aktionen" title="Letzte Aktionen" badge={sinceYesterday || null}>
  {#snippet actions()}<RevealTimer {reveal} />{/snippet}

  <div class="card relative overflow-hidden">
    {#if !items.length}
      <p class="px-4 py-5 text-[0.8125rem] text-slate-500">Noch keine Aktionen protokolliert. Hier erscheinen künftig erfasste Noten, neue Leistungsnachweise und Notizen.</p>
    {:else if !reveal.open}
      <Locked
        title={sinceYesterday ? `${sinceYesterday} Aktion${sinceYesterday === 1 ? '' : 'en'} seit gestern` : 'Keine Aktionen seit gestern'}
        text="Aus Datenschutzgründen verdeckt. Wird nach {reveal.seconds} Sekunden automatisch wieder ausgeblendet."
        onshow={reveal.show}
      />
    {:else}
      <div class="animate-fade-up">
        {#each days as d (d.label)}
          <div class="px-4 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{d.label}</div>
          {#each d.items as it (it.type === 'group' ? `g${it.first.id}` : it.e.id)}
            {@const ic = iconOf(it)}
            {@const e = it.type === 'group' ? it.first : it.e}
            <a href={link(it.cls, e)} class="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-t border-slate-100 px-4 py-2.5 transition first:border-t-0 hover:bg-slate-50 dark:border-line-dark dark:hover:bg-white/[0.03]">
              <span class="grid h-7 w-7 place-items-center rounded-lg {ic.tone}"><Icon name={ic.icon} size={14} stroke={2} /></span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem]">
                  {#if it.type === 'group'}
                    <b class="font-semibold text-slate-900 dark:text-white">{it.entries.length} Noten</b> erfasst
                  {:else if e.kind === 'grade' && e.status === 'nachtermin'}
                    Nachtermin offen für <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {:else if e.kind === 'grade' && e.changed}
                    Note geändert <GradeBadge value={e.prev ?? null} size="sm" /> → <GradeBadge value={e.value ?? null} status={e.status} size="sm" /> bei
                    <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {:else if e.kind === 'grade' && e.status === 'nicht_gewertet'}
                    <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b> nicht gewertet
                  {:else if e.kind === 'grade'}
                    Note <GradeBadge value={e.value ?? null} status={e.status} size="sm" /> für <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {:else if e.kind === 'grade_removed'}
                    Note {#if e.prev}<GradeBadge value={e.prev} size="sm" />{/if} gelöscht bei <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {:else if e.kind === 'assessment_added'}
                    <b class="font-semibold text-slate-900 dark:text-white">{typeById(e.typeId)?.name}</b> angelegt
                  {:else if e.kind === 'assessment_removed'}
                    <b class="font-semibold text-slate-900 dark:text-white">{typeById(e.typeId)?.name}</b> gelöscht
                  {:else if e.kind === 'note_added'}
                    Notiz <b class="font-semibold text-slate-900 dark:text-white">{e.topic ? NOTE_TOPICS[e.topic] : ''}</b> zu <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {:else if e.kind === 'report_grade'}
                    {e.term === 'zwischen' ? 'Zwischenzeugnis' : 'Jahreszeugnis'}:
                    {#if e.value}<GradeBadge value={e.value} size="sm" />{:else}Note entfernt{/if}
                    für <b class="font-semibold text-slate-900 dark:text-white">{studentName(it.cls, e.studentId)}</b>
                  {/if}
                </div>
                <div class="truncate text-[0.71875rem] text-slate-500">
                  {[e.kind === 'note_added' || e.kind === 'report_grade' ? '' : what(it.cls, e), where(it.cls, e), it.type === 'group' ? `Ø ${groupAvg(it.entries)}` : ''].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span class="pt-0.5 text-[0.71875rem] tabular-nums text-slate-400">{time(itemTime(it))}</span>
            </a>
          {/each}
        {/each}
        <div class="flex items-center gap-2 border-t border-slate-100 px-4 py-2 dark:border-line-dark">
          {#if items.length > PAGE}
            <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={() => (more = !more)}>{more ? 'Weniger' : `Mehr anzeigen (${Math.min(items.length, 40) - PAGE})`}</button>
          {/if}
          <span class="flex-1 text-[0.6875rem] text-slate-400">Einträge werden 30 Tage aufbewahrt.</span>
          <button class="btn h-7 px-2 text-[0.75rem] {confirmClear ? 'btn-danger' : 'btn-ghost'}" onclick={doClear}>
            <Icon name="trash" size={13} /> {confirmClear ? 'Wirklich leeren?' : 'Leeren'}
          </button>
        </div>
      </div>
    {/if}
  </div>
</Widget>
