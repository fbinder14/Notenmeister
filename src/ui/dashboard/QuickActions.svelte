<script lang="ts">
  import { addNote, fromLocalInput, NOTE_TOPICS, toLocalInput } from '../../lib/state/actions';
  import { toast } from '../../lib/state/toast.svelte';
  import type { NoteTopic, SchoolClass } from '../../lib/domain/types';
  import type { Ctx } from '../../lib/domain/grading';
  import Icon, { type IconName } from '../Icon.svelte';
  import Modal from '../Modal.svelte';
  import GradeFinder from './GradeFinder.svelte';
  import ObservationStarter from './ObservationStarter.svelte';

  /** Schnellzugriff: Noten erfassen, Beobachtung starten, Notiz anlegen. */
  let { classes, ctx }: { classes: SchoolClass[]; ctx: Ctx | null } = $props();

  type Mode = 'grade' | 'observe' | 'note';
  const ACTIONS: Array<{ mode: Mode; label: string; hint: string; icon: IconName; tone: string }> = [
    { mode: 'grade', label: 'Noten erfassen', hint: 'Einzelnote für eine Person', icon: 'zap', tone: 'from-brand-500 to-violet-500' },
    { mode: 'observe', label: 'Beobachtung starten', hint: 'Unterrichtsbeitrag beobachten', icon: 'eye', tone: 'from-sky-500 to-cyan-500' },
    { mode: 'note', label: 'Notiz anlegen', hint: 'Pädagogische Notiz', icon: 'edit', tone: 'from-amber-500 to-orange-500' },
  ];

  /** Noten und Beobachtungen starten mit der Schülersuche, Notizen mit einem Formular. */
  let finder = $state(false);
  let observer = $state(false);
  let noteOpen = $state(false);
  let classId = $state('');
  let studentId = $state('');
  let topic = $state<NoteTopic>('beobachtung');
  let text = $state('');
  let at = $state('');

  const hasCourses = $derived(classes.some((c) => c.courses.length));
  const noteClass = $derived(classes.find((c) => c.id === classId));
  const students = $derived(
    noteClass ? [...noteClass.students].filter((s) => !s.leftAt).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de')) : [],
  );
  const valid = $derived(!!noteClass && !!studentId && !!text.trim());

  function open(m: Mode) {
    if (m === 'grade') finder = true;
    else if (m === 'observe') observer = true;
    else {
      studentId = '';
      text = '';
      topic = 'beobachtung';
      at = toLocalInput(new Date().toISOString());
      if (!classes.some((c) => c.id === classId)) classId = classes.length === 1 ? classes[0].id : '';
      noteOpen = true;
    }
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || !noteClass) return;
    addNote(noteClass, studentId, { at: fromLocalInput(at), topic, text });
    toast.success('Notiz gespeichert.');
    noteOpen = false;
  }
</script>

<div class="grid gap-3 sm:grid-cols-3">
  {#each ACTIONS as a (a.mode)}
    <button
      class="card group flex items-center gap-3 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:pointer-events-none disabled:opacity-50"
      disabled={!hasCourses}
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

<Modal bind:open={noteOpen} title="Notiz anlegen" width="max-w-md">
  <form id="quick-note" class="grid gap-4" onsubmit={submit}>
    <label>
      <span class="label">Klasse</span>
      <select class="field" bind:value={classId} onchange={() => (studentId = '')}>
        <option value="" disabled>Bitte wählen …</option>
        {#each classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </label>
    <label>
      <span class="label">Schülerin oder Schüler</span>
      <select class="field" bind:value={studentId} disabled={!students.length}>
        <option value="" disabled>Bitte wählen …</option>
        {#each students as s (s.id)}<option value={s.id}>{s.lastName}, {s.firstName}</option>{/each}
      </select>
    </label>
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
  </form>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (noteOpen = false)}>Abbrechen</button>
    <button form="quick-note" class="btn btn-primary" disabled={!valid}>Speichern</button>
  {/snippet}
</Modal>

{#if ctx}<GradeFinder bind:open={finder} {classes} {ctx} />{/if}
<ObservationStarter bind:open={observer} {classes} />
