<script lang="ts">
  import { fade } from 'svelte/transition';
  import { app } from '../lib/state/app.svelte';
  import { href, router } from '../lib/state/router.svelte';
  import { subjectOf } from '../lib/state/actions';
  import Icon from '../ui/Icon.svelte';
  import { SUBJECT_DOT } from '../ui/colors';
  import ClassDialog from '../dialogs/ClassDialog.svelte';
  import Dashboard from './Dashboard.svelte';
  import ClassView from './ClassView.svelte';
  import Gradebook from './Gradebook.svelte';
  import AssessmentView from './AssessmentView.svelte';
  import QuickEntry from './QuickEntry.svelte';
  import ReportView from './ReportView.svelte';
  import StudentView from './StudentView.svelte';
  import PrintCourse from './PrintCourse.svelte';
  import Settings from './Settings.svelte';
  import PublicView from './PublicView.svelte';
  import Modal from '../ui/Modal.svelte';
  import { WrongPasswordError } from '../lib/crypto/vault';

  let newClass = $state(false);
  const r = $derived(router.route);
  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const activeClass = $derived('classId' in r ? r.classId : null);
  const activeCourse = $derived('courseId' in r ? r.courseId : null);

  const saveLabel = $derived(
    app.saveState === 'saving' ? 'Speichert …' : app.saveState === 'error' ? 'Fehler beim Speichern' : app.lastSavedAt ? 'Verschlüsselt gespeichert' : 'Bereit',
  );

  const pub = $derived(app.publicMode);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const publicKbd = isMac ? '⇧⌘P' : 'Strg+⇧+P';

  // Zurück in den Lehrer-Modus nur mit Master-Passwort
  let leaveOpen = $state(false);
  let leavePw = $state('');
  let leaveBusy = $state(false);
  let leaveError = $state('');

  function togglePublic() {
    if (!app.publicMode) {
      app.setPublicMode(true);
      return;
    }
    leavePw = '';
    leaveError = '';
    leaveOpen = true;
  }

  async function confirmLeave(e: Event) {
    e.preventDefault();
    if (!leavePw || leaveBusy) return;
    leaveBusy = true;
    leaveError = '';
    try {
      await app.leavePublicMode(leavePw);
      leaveOpen = false;
    } catch (err) {
      leaveError = err instanceof WrongPasswordError ? 'Das Passwort ist falsch.' : (err as Error).message;
    } finally {
      leavePw = '';
      leaveBusy = false;
    }
  }

  function onkey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      void app.lock();
    }
    // Lehrer-Modus ↔ öffentlicher Modus
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyP') {
      e.preventDefault();
      if (!leaveOpen) togglePublic();
    }
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="flex h-dvh overflow-hidden">
  <!-- Seitenleiste -->
  <aside class="glass no-print flex w-64 shrink-0 flex-col border-r">
    <div class="flex items-center gap-2.5 px-5 pb-4 pt-5">
      <div class="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_6px_16px_-6px_rgb(79_70_229/0.7)]">
        <Icon name="book" size={16} />
      </div>
      <div class="leading-tight">
        <div class="text-[0.875rem] font-semibold tracking-tight text-slate-900 dark:text-white">Notenmeister</div>
        <div class="text-[0.6875rem] text-slate-500">Schuljahr {year?.name ?? '–'}</div>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-3">
      <a
        href={href.dashboard()}
        class="mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8125rem] font-medium transition {r.name === 'dashboard'
          ? 'bg-white text-slate-900 shadow-soft dark:bg-white/10 dark:text-white'
          : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5'}"
      >
        <Icon name="home" size={16} /> Übersicht
      </a>

      <div class="mt-4 flex items-center justify-between px-3 pb-1.5">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Klassen</span>
        {#if !pub}
          <button class="rounded-md p-1 text-slate-400 transition hover:bg-slate-900/5 hover:text-brand-600 dark:hover:bg-white/10" onclick={() => (newClass = true)} title="Klasse anlegen" aria-label="Klasse anlegen">
            <Icon name="plus" size={14} stroke={2.25} />
          </button>
        {/if}
      </div>

      {#each classes as cls (cls.id)}
        <div class="mb-0.5">
          <a
            href={href.cls(cls.id)}
            class="flex items-center justify-between rounded-xl px-3 py-1.5 text-[0.8125rem] font-medium transition {activeClass === cls.id && (r.name === 'class' || pub)
              ? 'bg-white text-slate-900 shadow-soft dark:bg-white/10 dark:text-white'
              : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5'}"
          >
            <span class="flex items-center gap-2.5"><Icon name="users" size={15} class="text-slate-400" /> {cls.name}</span>
            <span class="text-[0.6875rem] tabular-nums text-slate-400">{cls.students.length}</span>
          </a>
          {#each (pub ? [] : cls.courses) as course (course.id)}
            {@const s = subjectOf(course)}
            <a
              href={href.course(cls.id, course.id)}
              class="ml-5 flex items-center gap-2 rounded-lg px-3 py-1 text-[0.78125rem] transition {activeCourse === course.id
                ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                : 'text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-slate-200'}"
            >
              <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
              <span class="truncate" title={s?.name}>{s?.name ?? 'Fach'}</span>
            </a>
          {/each}
        </div>
      {:else}
        {#if !pub}
        <button class="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded-xl border border-dashed border-slate-300 px-3 py-3 text-[0.78125rem] text-slate-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-line-dark" onclick={() => (newClass = true)}>
          + Erste Klasse anlegen
        </button>
        {/if}
      {/each}
    </nav>

    <div class="border-t border-slate-200/60 p-3 dark:border-line-dark">
      <button
        class="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[0.8125rem] font-medium transition {pub
          ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/70 hover:bg-amber-200/70 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30'
          : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5'}"
        onclick={togglePublic}
        title={pub ? 'Zurück zum Lehrer-Modus (Master-Passwort nötig)' : 'Öffentlicher Modus: nur Namen, Noten nach Rückfrage'}
      >
        <span class="flex items-center gap-2.5"><Icon name={pub ? 'eyeOff' : 'eye'} size={16} /> {pub ? 'Öffentlicher Modus' : 'Lehrer-Modus'}</span>
        <span class="kbd">{publicKbd}</span>
      </button>
      {#if !pub}
      <a
        href={href.settings()}
        class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8125rem] font-medium transition {r.name === 'settings'
          ? 'bg-white text-slate-900 shadow-soft dark:bg-white/10 dark:text-white'
          : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5'}"
      >
        <Icon name="settings" size={16} /> Einstellungen
      </a>
      {/if}
      <button class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[0.8125rem] font-medium text-slate-600 transition hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5" onclick={() => app.lock()}>
        <span class="flex items-center gap-2.5"><Icon name="lock" size={16} /> Sperren</span>
        <span class="kbd">⌘L</span>
      </button>
      <div class="mt-2 flex items-center gap-2 px-3 text-[0.6875rem] text-slate-400" title={app.lastSavedAt ? `Zuletzt: ${app.lastSavedAt.toLocaleTimeString('de-DE')}` : ''}>
        <span class="relative flex h-2 w-2">
          {#if app.saveState === 'saving'}<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>{/if}
          <span class="relative inline-flex h-2 w-2 rounded-full {app.saveState === 'error' ? 'bg-rose-500' : app.saveState === 'saving' ? 'bg-amber-400' : 'bg-emerald-500'}"></span>
        </span>
        {saveLabel}
      </div>
    </div>
  </aside>

  <!-- Inhalt -->
  <main class="flex-1 overflow-y-auto">
    {#key [r, pub]}
      <div in:fade={{ duration: 140 }} class="min-h-full">
        {#if pub}
          <!-- Nur freigegebene Inhalte: Klassen und Namen. Alle anderen Seiten fallen auf die Klasse zurück. -->
          <PublicView classId={'classId' in r ? r.classId : null} />
        {:else if r.name === 'dashboard'}
          <Dashboard onnewclass={() => (newClass = true)} />
        {:else if r.name === 'class'}
          <ClassView classId={r.classId} />
        {:else if r.name === 'course'}
          <Gradebook classId={r.classId} courseId={r.courseId} />
        {:else if r.name === 'assessment'}
          <AssessmentView classId={r.classId} courseId={r.courseId} assessmentId={r.assessmentId} />
        {:else if r.name === 'quick'}
          <QuickEntry classId={r.classId} courseId={r.courseId} />
        {:else if r.name === 'report'}
          <ReportView classId={r.classId} courseId={r.courseId} />
        {:else if r.name === 'student'}
          <StudentView classId={r.classId} studentId={r.studentId} />
        {:else if r.name === 'print'}
          <PrintCourse classId={r.classId} courseId={r.courseId} />
        {:else if r.name === 'settings'}
          <Settings />
        {/if}
      </div>
    {/key}
  </main>
</div>

{#if !pub}<ClassDialog bind:open={newClass} />{/if}

<Modal bind:open={leaveOpen} title="Zurück zum Lehrer-Modus" subtitle="Danach sind Noten, Notizen und Vermerke wieder sichtbar." width="max-w-sm">
  <form id="leave-public" onsubmit={confirmLeave} class="grid gap-3">
    <input class="field h-11 text-[0.9375rem]" type="password" placeholder="Master-Passwort" bind:value={leavePw} autocomplete="current-password" disabled={leaveBusy} />
    {#if leaveError}<p class="text-[0.8125rem] text-rose-600">{leaveError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="btn btn-ghost" onclick={() => (leaveOpen = false)}>Abbrechen</button>
    <button form="leave-public" class="btn btn-primary" disabled={!leavePw || leaveBusy}>
      {#if leaveBusy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Prüfe …{:else}<Icon name="lock" size={15} /> Entsperren{/if}
    </button>
  {/snippet}
</Modal>
