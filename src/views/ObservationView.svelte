<script lang="ts">
  import {
    addObservation,
    closeObservation,
    discardObservation,
    findClass,
    findCourse,
    fmtDate,
    fmtShortDate,
    removeObservation,
    startObservation,
    subjectOf,
    todayIso,
    typeById,
    updateObservation,
  } from '../lib/state/actions';
  import { chronological, closedPhases, observationStats, openPhase, phaseSince, starsToGradeHint } from '../lib/domain/observation';
  import { href } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import type { GradeValue, Observation, ObservationPhase, Stars as StarValue } from '../lib/domain/types';
  import PageHeader from '../ui/PageHeader.svelte';
  import Modal from '../ui/Modal.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import GradeBadge from '../ui/GradeBadge.svelte';
  import Stars from '../ui/Stars.svelte';

  let { classId, courseId, studentId }: { classId: string; courseId: string; studentId: string } = $props();

  const cls = $derived(findClass(classId));
  const course = $derived(findCourse(cls, courseId));
  const student = $derived(cls?.students.find((s) => s.id === studentId));
  const subject = $derived(course ? subjectOf(course) : undefined);
  const phase = $derived(course ? openPhase(course, studentId) : undefined);
  const history = $derived(course ? closedPhases(course, studentId) : []);
  const entries = $derived(phase ? [...chronological(phase.entries)].reverse() : []);
  const stats = $derived(observationStats(phase?.entries ?? []));

  const avgText = (avg: number | null) => (avg === null ? '–' : (Math.round(avg * 10) / 10).toFixed(1).replace('.', ','));
  const range = (s: { first: string | null; last: string | null }) =>
    s.first ? (s.first === s.last ? fmtShortDate(s.first) : `${fmtShortDate(s.first)}–${fmtShortDate(s.last!)}`) : '';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  // ---- Erfassen und Bearbeiten ----
  let at = $state(todayIso());
  let stars = $state<StarValue | null>(null);
  let text = $state('');
  let editing = $state<Observation | null>(null);
  let textEl = $state<HTMLTextAreaElement>();

  function resetForm() {
    editing = null;
    at = todayIso();
    stars = null;
    text = '';
  }

  function edit(o: Observation) {
    editing = o;
    at = o.at;
    stars = o.stars;
    text = o.text;
    textEl?.focus();
  }

  function save(e: Event) {
    e.preventDefault();
    if (!cls || !phase || !stars || !at) return;
    if (editing) updateObservation(cls, phase, editing.id, { at, stars, text });
    else addObservation(cls, phase, { at, stars, text });
    resetForm();
    textEl?.focus();
  }

  let delEntry = $state<Observation | null>(null);
  let discardOpen = $state(false);

  // ---- Abschließen ----
  let closeOpen = $state(false);
  let value = $state<GradeValue | null>(null);
  let gradeDate = $state(todayIso());
  let comment = $state('');
  const closeStats = $derived(observationStats(phase?.entries ?? []));
  const closeList = $derived(phase ? chronological(phase.entries) : []);

  function openClose() {
    value = null;
    gradeDate = todayIso();
    const s = observationStats(phase?.entries ?? []);
    comment = s.count ? `Unterrichtsbeobachtung ${range(s)}, ${plural(s.count, 'Beobachtung', 'Beobachtungen')}` : 'Unterrichtsbeobachtung';
    closeOpen = true;
  }

  function finish(e: Event) {
    e.preventDefault();
    if (!cls || !course || !phase || !value) return;
    // Heute: aktuelle Uhrzeit; anderer Tag: Mittag dieses Tages.
    const performedAt = gradeDate === todayIso() ? new Date().toISOString() : new Date(`${gradeDate}T12:00:00`).toISOString();
    closeObservation(cls, course, phase, { value, performedAt, comment: comment.trim() });
    closeOpen = false;
    toast.success(`Note ${value} für ${student?.firstName} gespeichert.`);
  }

  function gradeOf(p: ObservationPhase) {
    return course?.grades.find((g) => g.id === p.gradeId);
  }
</script>

{#if !cls || !course || !student}
  <div class="p-8"><Empty icon="users" title="Nicht gefunden" /></div>
{:else}
  <PageHeader
    title="{student.firstName} {student.lastName}"
    eyebrow="Klasse {cls.name} · {subject?.name ?? 'Fach'} · Unterrichtsbeobachtung"
    back={href.course(cls.id, course.id)}
  >
    {#snippet actions()}
      <a class="btn btn-ghost" href={href.student(cls.id, student.id)}><Icon name="users" size={15} /> Schülerseite</a>
      {#if phase}
        <button class="btn btn-ghost text-rose-600" onclick={() => (discardOpen = true)}><Icon name="trash" size={15} /> Verwerfen</button>
        <button class="btn btn-primary" onclick={openClose} disabled={!phase.entries.length} title={phase.entries.length ? '' : 'Erst eine Beobachtung erfassen'}>
          <Icon name="check" size={15} /> Beobachtung abschließen
        </button>
      {/if}
    {/snippet}
    {#if phase}
      <p class="flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-slate-500">
        <span>seit {fmtShortDate(phaseSince(phase))}</span>
        {#if stats.count}
          <span>· {plural(stats.days, 'Tag', 'Tage')}</span>
          <span>· {plural(stats.count, 'Beobachtung', 'Beobachtungen')}</span>
          <span class="flex items-center gap-1.5">· <Stars value={stats.avg} size={14} /> {avgText(stats.avg)}</span>
        {/if}
      </p>
    {/if}
  </PageHeader>

  <div class="mx-auto grid max-w-4xl gap-6 px-8 py-7">
    {#if phase}
      <section class="card overflow-hidden">
        <form onsubmit={save} class="grid gap-3 bg-slate-50/70 px-5 py-4 dark:bg-white/[0.02]">
          <div class="grid gap-3 sm:grid-cols-[10rem_auto_1fr]">
            <label><span class="label">Datum</span><input class="field" type="date" bind:value={at} max={todayIso()} required /></label>
            <div>
              <span class="label">Qualität der Beiträge</span>
              <div class="flex h-10 items-center"><Stars value={stars} size={24} onchange={(v) => (stars = v)} /></div>
            </div>
            <label class="sm:row-span-1">
              <span class="label">Notiz</span>
              <textarea
                bind:this={textEl}
                class="field h-10 min-h-10 resize-y py-2 leading-snug"
                bind:value={text}
                placeholder="Was ist dir aufgefallen?"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e);
                }}
              ></textarea>
            </label>
          </div>
          <div class="flex items-center justify-end gap-2">
            <span class="mr-auto text-[0.6875rem] text-slate-400"><span class="kbd">1</span>–<span class="kbd">5</span> auf den Sternen · <span class="kbd">⌘↵</span> speichert</span>
            {#if editing}<button type="button" class="btn btn-ghost" onclick={resetForm}>Abbrechen</button>{/if}
            <button class="btn btn-soft" disabled={!stars || !at}><Icon name={editing ? 'check' : 'plus'} size={15} /> {editing ? 'Änderung speichern' : 'Beobachtung erfassen'}</button>
          </div>
        </form>
        {#if entries.length}
          <ul>
            {#each entries as o (o.id)}
              <li class="group grid grid-cols-[5.5rem_7rem_1fr_auto] items-start gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] dark:border-line-dark {editing?.id === o.id ? 'bg-brand-50/60 dark:bg-white/5' : ''}">
                <span class="tabular-nums text-slate-500">{fmtDate(o.at)}</span>
                <Stars value={o.stars} size={15} />
                <p class="min-w-0 whitespace-pre-wrap leading-relaxed {o.text ? '' : 'text-slate-400'}">{o.text || 'ohne Notiz'}</p>
                <div class="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button class="btn btn-ghost h-7 w-7 px-0" onclick={() => edit(o)} aria-label="Beobachtung bearbeiten"><Icon name="edit" size={14} /></button>
                  <button class="btn btn-ghost h-7 w-7 px-0 text-rose-600" onclick={() => (delEntry = o)} aria-label="Beobachtung löschen"><Icon name="trash" size={14} /></button>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="border-t border-slate-100 px-5 py-4 text-[0.8125rem] text-slate-400 dark:border-line-dark">
            Noch keine Beobachtung. Erfasse über die nächsten zwei bis drei Wochen in mehreren Stunden, wie sich {student.firstName} am Unterricht beteiligt.
          </p>
        {/if}
      </section>
    {:else}
      <Empty icon="eye" title="Keine laufende Beobachtung" text="Starte eine Beobachtungsphase und erfasse über mehrere Stunden Eindrücke, bevor du die Note für den Unterrichtsbeitrag festlegst.">
        <button class="btn btn-primary" onclick={() => startObservation(cls, course, student.id)}><Icon name="eye" size={15} /> Beobachtung starten</button>
      </Empty>
    {/if}

    {#if history.length}
      <section>
        <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Frühere Beobachtungen</h2>
        <div class="card overflow-hidden">
          {#each history as p (p.id)}
            {@const s = observationStats(p.entries)}
            {@const g = gradeOf(p)}
            <details class="group border-t border-slate-100 first:border-t-0 dark:border-line-dark">
              <summary class="flex cursor-pointer list-none items-center gap-3 px-5 py-3 text-[0.8125rem]">
                <Icon name="chevron" size={14} class="text-slate-400 transition group-open:rotate-90" />
                <span class="tabular-nums">{range(s) || fmtShortDate(p.startedAt)}</span>
                <span class="text-slate-500">{plural(s.count, 'Beobachtung', 'Beobachtungen')}</span>
                <span class="flex items-center gap-1.5 text-slate-500"><Stars value={s.avg} size={13} /> {avgText(s.avg)}</span>
                <span class="ml-auto flex items-center gap-2 text-[0.75rem] text-slate-500">
                  {#if g}Note vom {fmtDate(g.performedAt)} <GradeBadge value={g.value} status={g.status} size="sm" />{:else}Note gelöscht{/if}
                </span>
              </summary>
              <ul class="pb-2">
                {#each chronological(p.entries) as o (o.id)}
                  <li class="grid grid-cols-[5.5rem_7rem_1fr] gap-3 px-5 py-1.5 pl-12 text-[0.78125rem]">
                    <span class="tabular-nums text-slate-500">{fmtDate(o.at)}</span>
                    <Stars value={o.stars} size={13} />
                    <span class="whitespace-pre-wrap">{o.text}</span>
                  </li>
                {/each}
              </ul>
            </details>
          {/each}
        </div>
      </section>
    {/if}
  </div>

  {#if phase}
    <Modal bind:open={closeOpen} title="Beobachtung abschließen" subtitle="{student.firstName} {student.lastName} · {subject?.name ?? ''} · {range(closeStats)} · {plural(closeStats.days, 'Tag', 'Tage')} · {plural(closeStats.count, 'Beobachtung', 'Beobachtungen')}" width="max-w-xl">
      <form id="close-form" onsubmit={finish} class="grid gap-4">
        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-white/[0.03]">
          <span class="text-[0.8125rem] text-slate-500">Durchschnitt</span>
          <span class="flex items-center gap-2"><Stars value={closeStats.avg} size={20} /> <b class="text-[1rem] tabular-nums">{avgText(closeStats.avg)}</b></span>
        </div>
        <ul class="max-h-64 overflow-y-auto">
          {#each closeList as o (o.id)}
            <li class="grid grid-cols-[4rem_6.5rem_1fr] items-baseline gap-3 border-t border-slate-100 py-1.5 text-[0.78125rem] first:border-t-0 dark:border-line-dark">
              <span class="tabular-nums text-slate-500">{fmtShortDate(o.at)}</span>
              <Stars value={o.stars} size={14} />
              <span class="whitespace-pre-wrap {o.text ? '' : 'text-slate-400'}">{o.text || 'ohne Notiz'}</span>
            </li>
          {/each}
        </ul>
        <div>
          <span class="label">Note {#if closeStats.avg !== null}<span class="font-normal text-slate-400">· Orientierung aus den Sternen: {starsToGradeHint(closeStats.avg)}</span>{/if}</span>
          <div class="grid grid-cols-6 gap-1.5">
            {#each [1, 2, 3, 4, 5, 6] as v (v)}
              <button
                type="button"
                class="h-11 rounded-xl text-[1rem] font-semibold ring-1 ring-inset transition active:scale-95 {value === v
                  ? 'bg-brand-600 text-white ring-brand-600 shadow-[0_6px_16px_-6px_rgb(79_70_229/0.7)]'
                  : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300 dark:bg-white/5 dark:text-slate-200 dark:ring-line-dark'}"
                onclick={() => (value = v as GradeValue)}>{v}</button
              >
            {/each}
          </div>
        </div>
        <div class="grid grid-cols-[10rem_1fr] gap-3">
          <label><span class="label">Datum der Note</span><input class="field" type="date" bind:value={gradeDate} required /></label>
          <label><span class="label">Bemerkung</span><input class="field" bind:value={comment} /></label>
        </div>
        <p class="text-[0.75rem] text-slate-500">Die Note wird als {typeById(phase.typeId)?.name ?? 'Unterrichtsbeitrag'} gespeichert; die Beobachtungen bleiben zum Nachlesen erhalten.</p>
      </form>
      {#snippet footer()}
        <button type="button" class="btn btn-ghost" onclick={() => (closeOpen = false)}>Weiter beobachten</button>
        <button form="close-form" class="btn btn-primary" disabled={!value || !gradeDate}>Note speichern</button>
      {/snippet}
    </Modal>

    <Modal open={discardOpen} title="Beobachtung verwerfen?" width="max-w-md" onclose={() => (discardOpen = false)}>
      <p class="text-[0.8125rem] leading-relaxed">Die laufende Beobachtung mit {plural(phase.entries.length, 'Eintrag', 'Einträgen')} wird ohne Note gelöscht.</p>
      {#snippet footer()}
        <button class="btn btn-ghost" onclick={() => (discardOpen = false)}>Abbrechen</button>
        <button class="btn btn-danger" onclick={() => { discardObservation(cls, course, phase); discardOpen = false; }}><Icon name="trash" size={15} /> Verwerfen</button>
      {/snippet}
    </Modal>

    <Modal open={!!delEntry} title="Beobachtung löschen?" width="max-w-md" onclose={() => (delEntry = null)}>
      {#if delEntry}<p class="text-[0.8125rem] leading-relaxed">Die Beobachtung vom {fmtDate(delEntry.at)} wird gelöscht.</p>{/if}
      {#snippet footer()}
        <button class="btn btn-ghost" onclick={() => (delEntry = null)}>Abbrechen</button>
        <button class="btn btn-danger" onclick={() => { if (delEntry) { removeObservation(cls, phase, delEntry.id); if (editing?.id === delEntry.id) resetForm(); } delEntry = null; }}><Icon name="trash" size={15} /> Löschen</button>
      {/snippet}
    </Modal>
  {/if}
{/if}
