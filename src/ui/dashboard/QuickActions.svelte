<script lang="ts">
  import { addNote, courseStudents, fromLocalInput, NOTE_TOPICS, startObservation, subjectOf, toLocalInput } from '../../lib/state/actions';
  import { go, href } from '../../lib/state/router.svelte';
  import { toast } from '../../lib/state/toast.svelte';
  import type { NoteTopic, SchoolClass } from '../../lib/domain/types';
  import Icon, { type IconName } from '../Icon.svelte';
  import Modal from '../Modal.svelte';
  import GradeFinder from './GradeFinder.svelte';
  import type { Ctx } from '../../lib/domain/grading';

  /** Schnellzugriff: Noten erfassen, Beobachtung starten, Notiz anlegen. */
  let { classes, ctx }: { classes: SchoolClass[]; ctx: Ctx | null } = $props();

  type Mode = 'grade' | 'observe' | 'note';
  const ACTIONS: Array<{ mode: Mode; label: string; hint: string; icon: IconName; tone: string }> = [
    { mode: 'grade', label: 'Noten erfassen', hint: 'Einzelnote für eine Person', icon: 'zap', tone: 'from-brand-500 to-violet-500' },
    { mode: 'observe', label: 'Beobachtung starten', hint: 'Unterrichtsbeitrag beobachten', icon: 'eye', tone: 'from-sky-500 to-cyan-500' },
    { mode: 'note', label: 'Notiz anlegen', hint: 'Pädagogische Notiz', icon: 'edit', tone: 'from-amber-500 to-orange-500' },
  ];

  /** Formular für Beobachtung und Notiz; Noten laufen über die Schülersuche. */
  let mode = $state<Exclude<Mode, 'grade'> | null>(null);
  let finder = $state(false);
  let courseKey = $state('');
  let classId = $state('');
  let studentId = $state('');
  let topic = $state<NoteTopic>('beobachtung');
  let text = $state('');
  let at = $state('');

  const courses = $derived(
    classes.flatMap((cls) => cls.courses.map((course) => ({ cls, course, key: `${cls.id}/${course.id}`, label: `${cls.name} · ${subjectOf(course)?.name ?? ''}` }))),
  );
  const picked = $derived(courses.find((c) => c.key === courseKey));
  const noteClass = $derived(classes.find((c) => c.id === classId));
  const students = $derived(
    mode === 'observe' && picked
      ? courseStudents(picked.cls, picked.course).filter((s) => !s.leftAt)
      : mode === 'note' && noteClass
        ? [...noteClass.students].filter((s) => !s.leftAt).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'))
        : [],
  );
  const running = $derived(
    mode === 'observe' && picked ? new Set((picked.course.observations ?? []).filter((p) => !p.closedAt).map((p) => p.studentId)) : new Set<string>(),
  );

  const title = $derived(ACTIONS.find((a) => a.mode === mode)?.label ?? '');
  const valid = $derived(
    mode === 'observe' ? !!picked && !!studentId : mode === 'note' ? !!noteClass && !!studentId && !!text.trim() : false,
  );

  function open(m: Mode) {
    if (m === 'grade') {
      finder = true;
      return;
    }
    mode = m;
    studentId = '';
    text = '';
    topic = 'beobachtung';
    at = toLocalInput(new Date().toISOString());
    if (!courses.some((c) => c.key === courseKey)) courseKey = courses.length === 1 ? courses[0].key : '';
    if (!classes.some((c) => c.id === classId)) classId = classes.length === 1 ? classes[0].id : '';
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    if (mode === 'observe' && picked) {
      startObservation(picked.cls, picked.course, studentId);
      go(href.observation(picked.cls.id, picked.course.id, studentId));
    } else if (mode === 'note' && noteClass) {
      addNote(noteClass, studentId, { at: fromLocalInput(at), topic, text });
      toast.success('Notiz gespeichert.');
    }
    mode = null;
  }
</script>

<div class="grid gap-3 sm:grid-cols-3">
  {#each ACTIONS as a (a.mode)}
    <button
      class="card group flex items-center gap-3 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:pointer-events-none disabled:opacity-50"
      disabled={!courses.length}
      onclick={() => open(a.mode)}
    >
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br {a.tone} text-white shadow-soft"><Icon name={a.icon} size={17} /></span>
      <span class="min-w-0">
        <span class="block text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{a.label}</span>
        <span class="block truncate text-[0.71875rem] text-slate-500">{a.hint}</span>
      </span>
    </button>
  {/each}
</div>

<Modal open={!!mode} {title} width="max-w-md" onclose={() => (mode = null)}>
  <form id="quick-action" class="grid gap-4" onsubmit={submit}>
    {#if mode === 'note'}
      <label>
        <span class="label">Klasse</span>
        <select class="field" bind:value={classId} onchange={() => (studentId = '')}>
          <option value="" disabled>Bitte wählen …</option>
          {#each classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
    {:else}
      <label>
        <span class="label">Kurs</span>
        <select class="field" bind:value={courseKey} onchange={() => (studentId = '')}>
          <option value="" disabled>Bitte wählen …</option>
          {#each courses as c (c.key)}<option value={c.key}>{c.label}</option>{/each}
        </select>
      </label>
    {/if}

    {#if mode === 'observe' || mode === 'note'}
      <label>
        <span class="label">Schülerin oder Schüler</span>
        <select class="field" bind:value={studentId} disabled={!students.length}>
          <option value="" disabled>Bitte wählen …</option>
          {#each students as s (s.id)}
            <option value={s.id}>{s.lastName}, {s.firstName}{running.has(s.id) ? ' (läuft bereits)' : ''}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if mode === 'note'}
      <div class="grid grid-cols-2 gap-3">
        <label>
          <span class="label">Art</span>
          <select class="field" bind:value={topic}>
            {#each Object.entries(NOTE_TOPICS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
          </select>
        </label>
        <label><span class="label">Zeitpunkt</span><input class="field" type="datetime-local" bind:value={at} /></label>
      </div>
      <label>
        <span class="label">Notiz</span>
        <textarea class="field h-28 resize-y py-2 leading-relaxed" bind:value={text} placeholder="Was ist vorgefallen, was wurde besprochen?"></textarea>
      </label>
    {:else if mode === 'observe' && running.has(studentId)}
      <p class="text-[0.75rem] text-slate-500">Für diese Person läuft bereits eine Beobachtung – sie wird geöffnet.</p>
    {/if}
  </form>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (mode = null)}>Abbrechen</button>
    <button form="quick-action" class="btn btn-primary" disabled={!valid}>{mode === 'note' ? 'Speichern' : 'Öffnen'}</button>
  {/snippet}
</Modal>

{#if ctx}<GradeFinder bind:open={finder} {classes} {ctx} />{/if}
