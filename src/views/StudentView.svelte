<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { entriesFor, formatAvg, summarize, type Ctx } from '../lib/domain/grading';
  import {
    addNote,
    findClass,
    fmtDate,
    fmtDateTime,
    fromLocalInput,
    NOTE_TOPICS,
    notesOf,
    removeNote,
    startObservation,
    STATUS_LABEL,
    sportDetail,
    studentGradeRows,
    subjectOf,
    toLocalInput,
    updateNote,
    yearOf,
  } from '../lib/state/actions';
  import { go, href } from '../lib/state/router.svelte';
  import { openPhase } from '../lib/domain/observation';
  import ObservationBadge from '../ui/ObservationBadge.svelte';
  import type { Course, NoteTopic, StudentNote } from '../lib/domain/types';
  import Modal from '../ui/Modal.svelte';
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

  const list = (c: Course) => studentGradeRows(c, studentId);

  // ---- Pädagogische Notizen ----
  const notes = $derived(cls ? notesOf(cls, studentId) : []);
  let topicFilter = $state<NoteTopic | ''>('');
  const shownNotes = $derived(topicFilter ? notes.filter((n) => n.topic === topicFilter) : notes);

  let editing = $state<StudentNote | null>(null);
  let noteOpen = $state(false);
  let noteAt = $state('');
  let noteTopic = $state<NoteTopic>('beobachtung');
  let noteText = $state('');
  let delNote = $state<StudentNote | null>(null);

  function openNote(n: StudentNote | null) {
    editing = n;
    noteAt = toLocalInput(n?.at ?? new Date().toISOString());
    noteTopic = n?.topic ?? 'beobachtung';
    noteText = n?.text ?? '';
    noteOpen = true;
  }
  function saveNote(e: Event) {
    e.preventDefault();
    if (!cls || !noteText.trim()) return;
    const input = { at: fromLocalInput(noteAt), topic: noteTopic, text: noteText };
    if (editing) updateNote(cls, editing.id, input);
    else addNote(cls, studentId, input);
    noteOpen = false;
  }

  /** Beim Drucken entweder den Notenbogen oder die Notizen ausgeben. */
  let printing = $state<'noten' | 'notizen'>('noten');
  function printAs(what: 'noten' | 'notizen') {
    printing = what;
    // Erst nach dem Neuzeichnen drucken, damit die richtigen Abschnitte sichtbar sind.
    requestAnimationFrame(() => {
      print();
      printing = 'noten';
    });
  }

  const TOPIC_CLASS: Record<NoteTopic, string> = {
    beobachtung: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
    lob: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    verhalten: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    eltern: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    massnahme: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  };

  function report(c: Course, term: 'zwischen' | 'jahr') {
    return c.reportGrades.find((r) => r.studentId === studentId && r.term === term)?.value ?? null;
  }
</script>

{#if !cls || !s || !ctx}
  <div class="p-8"><Empty icon="users" title="Nicht gefunden" /></div>
{:else}
  <PageHeader title="{s.firstName} {s.lastName}" eyebrow="Klasse {cls.name} · Notenbogen {year?.name}" back={href.cls(cls.id)}>
    {#snippet actions()}
      <button class="btn btn-soft" onclick={() => openNote(null)}><Icon name="plus" size={15} /> Notiz</button>
      <button class="btn btn-soft" onclick={() => printAs('noten')}><Icon name="print" size={15} /> Notenbogen drucken</button>
    {/snippet}
  </PageHeader>

  <div class="mx-auto grid max-w-5xl gap-5 px-8 py-7">
    <div class="print-only mb-2">
      <h1 class="text-[16pt] font-semibold">{printing === 'notizen' ? 'Pädagogische Notizen' : 'Notenbogen'} {s.lastName}, {s.firstName}</h1>
      <p>Klasse {cls.name} · Schuljahr {year?.name} · Stand {new Date().toLocaleString('de-DE')}</p>
    </div>
    <!-- Pädagogische Notizen (nur im Lehrer-Modus erreichbar) -->
    <section class="card overflow-hidden {printing === 'notizen' ? '' : 'no-print'}">
      <div class="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-line-dark">
        <h2 class="flex items-center gap-2 text-[0.9375rem] font-semibold"><Icon name="edit" size={16} class="text-slate-400" /> Pädagogische Notizen <span class="text-[0.75rem] font-normal text-slate-400">{notes.length}</span></h2>
        <div class="flex flex-wrap items-center gap-1.5">
          {#if notes.length}
            <select class="field h-8 w-40 text-[0.75rem]" bind:value={topicFilter} aria-label="Nach Art filtern">
              <option value="">Alle Arten</option>
              {#each Object.entries(NOTE_TOPICS) as [k, l] (k)}<option value={k}>{l}</option>{/each}
            </select>
            <button class="btn btn-ghost h-8 px-2.5 text-[0.75rem]" onclick={() => printAs('notizen')} title="Notizen für Elterngespräch oder Konferenz drucken"><Icon name="print" size={14} /> Drucken</button>
          {/if}
          <button class="btn btn-primary h-8 px-3 text-[0.75rem]" onclick={() => openNote(null)}><Icon name="plus" size={14} /> Notiz</button>
        </div>
      </div>
      {#if shownNotes.length}
        <ul>
          {#each shownNotes as n (n.id)}
            <li class="group flex gap-4 border-t border-slate-100 px-5 py-3 first:border-t-0 dark:border-line-dark">
              <div class="w-32 shrink-0 text-[0.75rem] tabular-nums text-slate-500">
                {fmtDateTime(n.at)}
                <div class="mt-1"><span class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium {TOPIC_CLASS[n.topic]}">{NOTE_TOPICS[n.topic]}</span></div>
              </div>
              <p class="min-w-0 flex-1 whitespace-pre-wrap text-[0.8125rem] leading-relaxed">{n.text}</p>
              <div class="no-print flex shrink-0 items-start gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button class="btn btn-ghost h-7 w-7 px-0" onclick={() => openNote(n)} aria-label="Notiz bearbeiten"><Icon name="edit" size={14} /></button>
                <button class="btn btn-ghost h-7 w-7 px-0 text-rose-600" onclick={() => (delNote = n)} aria-label="Notiz löschen"><Icon name="trash" size={14} /></button>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="px-5 py-4 text-[0.8125rem] text-slate-400">
          {notes.length ? 'Keine Notizen dieser Art.' : 'Noch keine Notizen – z. B. Beobachtungen, Lob, Elternkontakte für Gespräche und Konferenzen.'}
        </p>
      {/if}
    </section>

    {#if s.support}
      <div class="{printing === 'notizen' ? 'no-print' : ''} rounded-xl bg-violet-50 px-4 py-2.5 text-[0.8125rem] text-violet-800 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/20">{s.support}</div>
    {/if}
    {#each courses as c (c.id)}
      {@const subj = subjectOf(c)}
      {@const h1 = summarize(entriesFor(c, s.id, ctx, 1))}
      {@const all = summarize(entriesFor(c, s.id, ctx, 'jahr'))}
      <section class="card overflow-hidden {printing === 'notizen' ? 'no-print' : ''}" style="break-inside: avoid">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-line-dark">
          <div class="flex flex-wrap items-center gap-3">
            <a href={href.course(cls.id, c.id)} class="flex items-center gap-2.5 text-[0.9375rem] font-semibold hover:text-brand-600">
              <span class="h-2.5 w-2.5 rounded-full {SUBJECT_DOT[subj?.color ?? 'slate']}"></span>{subj?.name}
            </a>
            {#if openPhase(c, s.id)}
              <span class="no-print"><ObservationBadge phase={openPhase(c, s.id)!} link={href.observation(cls.id, c.id, s.id)} /></span>
            {:else}
              <button
                class="no-print btn btn-ghost h-6 px-2 text-[0.6875rem] text-slate-500"
                onclick={() => { startObservation(cls, c, s.id); go(href.observation(cls.id, c.id, s.id)); }}
                title="Unterrichtsbeobachtung für {subj?.name} starten"
              ><Icon name="eye" size={13} /> Beobachtung starten</button>
              {#if c.observations?.some((p) => p.studentId === s.id)}
                <a class="no-print text-[0.6875rem] text-slate-400 hover:text-brand-600" href={href.observation(cls.id, c.id, s.id)}>frühere Beobachtungen</a>
              {/if}
            {/if}
          </div>
          <div class="flex gap-5 text-[0.75rem] text-slate-500">
            <span>1. Hj. <b class="tabular-nums text-slate-800 dark:text-slate-100">{formatAvg(h1.total)}</b></span>
            <span>Schuljahr <b class="tabular-nums text-slate-800 dark:text-slate-100">{formatAvg(all.total)}</b></span>
            <span class="flex items-center gap-1">ZZ <GradeBadge value={report(c, 'zwischen')} size="sm" />{#if !report(c, 'zwischen')}–{/if}</span>
            <span class="flex items-center gap-1">JZ <GradeBadge value={report(c, 'jahr')} size="sm" />{#if !report(c, 'jahr')}–{/if}</span>
          </div>
        </div>
        {#if list(c).length}
          <table class="w-full text-[0.8125rem]">
            <tbody>
              {#each list(c) as row (row.g.id)}
                <tr class="border-t border-slate-100 first:border-t-0 dark:border-line-dark">
                  <td class="w-24 px-5 py-1.5 tabular-nums text-slate-500">{fmtDate(row.date)}</td>
                  <td class="px-2 py-1.5">
                    {row.name}
                    {#if row.g.sport}<div class="text-[0.6875rem] text-slate-500">{sportDetail(row.g, c.assessments.find((x) => x.id === row.g.assessmentId))}</div>{/if}
                  </td>
                  <td class="w-16 px-2 py-1.5 text-center text-[0.75rem] text-slate-400">×{row.weight}</td>
                  <td class="w-14 px-2 py-1.5 text-center"><GradeBadge value={row.g.value} status={row.g.status} size="sm" /></td>
                  <td class="px-5 py-1.5 text-[0.75rem] text-slate-500">
                    {row.g.status !== 'gewertet' ? STATUS_LABEL[row.g.status] : ''}{row.g.comment ? `${row.g.status !== 'gewertet' ? ' · ' : ''}${row.g.comment}` : ''}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="px-5 py-4 text-[0.8125rem] text-slate-400">Noch keine Noten.</p>
        {/if}
      </section>
    {:else}
      <Empty icon="book" title="Keine Unterrichte" />
    {/each}
  </div>

  <Modal bind:open={noteOpen} title={editing ? 'Notiz bearbeiten' : 'Neue Notiz'} subtitle="{s.firstName} {s.lastName} · Klasse {cls.name}" width="max-w-lg">
    <form id="note-form" class="grid gap-3" onsubmit={saveNote}>
      <div class="grid grid-cols-2 gap-3">
        <label><span class="label">Datum und Uhrzeit</span><input class="field" type="datetime-local" bind:value={noteAt} /></label>
        <label>
          <span class="label">Art</span>
          <select class="field" bind:value={noteTopic}>
            {#each Object.entries(NOTE_TOPICS) as [k, l] (k)}<option value={k}>{l}</option>{/each}
          </select>
        </label>
      </div>
      <label>
        <span class="label">Notiz</span>
        <textarea class="field h-40 resize-y py-2 leading-relaxed" bind:value={noteText} placeholder="Was ist vorgefallen, was wurde besprochen, was ist vereinbart?"
          onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(e); }}></textarea>
      </label>
      {#if editing}
        <p class="text-[0.6875rem] text-slate-400">Angelegt {fmtDateTime(editing.createdAt)}{editing.updatedAt !== editing.createdAt ? ` · zuletzt geändert ${fmtDateTime(editing.updatedAt)}` : ''}</p>
      {/if}
    </form>
    {#snippet footer()}
      <span class="mr-auto text-[0.6875rem] text-slate-400"><span class="kbd">⌘↵</span> speichert</span>
      <button type="button" class="btn btn-ghost" onclick={() => (noteOpen = false)}>Abbrechen</button>
      <button form="note-form" class="btn btn-primary" disabled={!noteText.trim()}>Speichern</button>
    {/snippet}
  </Modal>

  <Modal open={!!delNote} title="Notiz löschen?" width="max-w-md" onclose={() => (delNote = null)}>
    {#if delNote}
      <p class="text-[0.8125rem] leading-relaxed">Die Notiz vom {fmtDateTime(delNote.at)} ({NOTE_TOPICS[delNote.topic]}) wird endgültig gelöscht.</p>
      <p class="mt-2 line-clamp-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.78125rem] italic text-slate-600 dark:bg-white/5 dark:text-slate-300">{delNote.text}</p>
    {/if}
    {#snippet footer()}
      <button class="btn btn-ghost" onclick={() => (delNote = null)}>Abbrechen</button>
      <button class="btn btn-danger" onclick={() => { if (delNote && cls) removeNote(cls, delNote.id); delNote = null; }}><Icon name="trash" size={15} /> Löschen</button>
    {/snippet}
  </Modal>
{/if}
