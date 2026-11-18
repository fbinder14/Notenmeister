<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { findClass, removeCourse, removeStudent, sortStudents, startObservation, subjectOf, updateStudent } from '../lib/state/actions';
  import { openPhase } from '../lib/domain/observation';
  import ObservationBadge from '../ui/ObservationBadge.svelte';
  import { href, go } from '../lib/state/router.svelte';
  import { toast } from '../lib/state/toast.svelte';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import Modal from '../ui/Modal.svelte';
  import ClassDialog from '../dialogs/ClassDialog.svelte';
  import CourseDialog from '../dialogs/CourseDialog.svelte';
  import ImportDialog from '../dialogs/ImportDialog.svelte';
  import { SUBJECT_TINT } from '../ui/colors';
  import type { Course, Student } from '../lib/domain/types';

  let { classId }: { classId: string } = $props();
  const cls = $derived(findClass(classId));

  let editClass = $state(false);
  let courseOpen = $state(false);
  let editCourse = $state<Course | null>(null);
  let importOpen = $state(false);
  let editStudent = $state<Student | null>(null);
  let studentForm = $state({ lastName: '', firstName: '', support: '', leftAt: '' });
  let confirm = $state<{ text: string; run: () => void } | null>(null);

  const students = $derived(cls ? sortStudents(cls.students) : []);
  const noteCount = $derived((cls?.notes ?? []).reduce((m, n) => m.set(n.studentId, (m.get(n.studentId) ?? 0) + 1), new Map<string, number>()));

  /** Auswahl des Fachs, in dem eine Beobachtung gestartet werden soll. */
  let observeFor = $state<Student | null>(null);
  const coursesOf = (s: Student) => (cls ? cls.courses.filter((c) => !c.excludedStudentIds.includes(s.id)) : []);

  function observe(s: Student) {
    const list = coursesOf(s);
    if (list.length === 1) begin(s, list[0]);
    else observeFor = s;
  }

  function begin(s: Student, c: Course) {
    if (!cls) return;
    startObservation(cls, c, s.id);
    go(href.observation(cls.id, c.id, s.id));
  }

  function openStudent(s: Student) {
    editStudent = s;
    studentForm = { lastName: s.lastName, firstName: s.firstName, support: s.support ?? '', leftAt: s.leftAt ?? '' };
  }

  function saveStudent(e: Event) {
    e.preventDefault();
    if (!cls || !editStudent) return;
    updateStudent(cls, editStudent.id, {
      lastName: studentForm.lastName.trim(),
      firstName: studentForm.firstName.trim(),
      support: studentForm.support.trim() || undefined,
      leftAt: studentForm.leftAt || undefined,
    });
    editStudent = null;
  }

  function askRemoveStudent(s: Student) {
    const n = cls!.courses.reduce((m, c) => m + c.grades.filter((g) => g.studentId === s.id).length, 0);
    confirm = {
      text: `${s.firstName} ${s.lastName} entfernen?${n ? ` Dabei werden ${n} Noten gelöscht.` : ''} Bei einem Schulwechsel besser ein Austrittsdatum setzen.`,
      run: () => {
        removeStudent(cls!, s.id);
        editStudent = null;
      },
    };
  }

  function askRemoveCourse(c: Course) {
    confirm = {
      text: `Unterricht ${subjectOf(c)?.name} mit ${c.assessments.length} Leistungsnachweisen und ${c.grades.length} Noten löschen?`,
      run: () => removeCourse(cls!, c.id),
    };
  }

  function askRemoveClass() {
    confirm = {
      text: `Klasse ${cls!.name} mit allen Unterrichten und Noten endgültig löschen? Das lässt sich nicht rückgängig machen.`,
      run: () => {
        app.removeClass(cls!.id);
        toast.info('Klasse gelöscht.');
        go(href.dashboard());
      },
    };
  }
</script>

{#if !cls}
  <div class="p-8"><Empty icon="users" title="Klasse nicht gefunden" /></div>
{:else}
  <PageHeader title="Klasse {cls.name}" eyebrow="Jahrgangsstufe {cls.gradeLevel}{cls.wpf ? ` · Wahlpflichtfächergruppe ${cls.wpf}` : ''}">
    {#snippet actions()}
      <button class="btn btn-ghost" onclick={() => (editClass = true)}><Icon name="edit" size={15} /> Bearbeiten</button>
      <button class="btn btn-soft" onclick={() => (importOpen = true)}><Icon name="users" size={15} /> Schüler hinzufügen</button>
      <button class="btn btn-primary" onclick={() => { editCourse = null; courseOpen = true; }}><Icon name="plus" size={15} /> Fach hinzufügen</button>
    {/snippet}
  </PageHeader>

  <div class="mx-auto grid max-w-6xl gap-7 px-8 py-7">
    <section>
      <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Meine Fächer in dieser Klasse</h2>
      {#if cls.courses.length}
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each cls.courses as c (c.id)}
            {@const s = subjectOf(c)}
            <div class="card group relative overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <div class="absolute inset-0 bg-gradient-to-br {SUBJECT_TINT[s?.color ?? 'slate']} opacity-70"></div>
              <a href={href.course(cls.id, c.id)} class="relative block p-4">
                <div class="text-[0.75rem] font-semibold uppercase tracking-wide">{s?.short}</div>
                <div class="truncate text-[0.9375rem] font-semibold text-slate-900 dark:text-white" title={s?.name}>{s?.name}</div>
                <div class="mt-2 flex flex-wrap gap-x-3 text-[0.75rem] text-slate-500">
                  <span>{c.weeklyHours} Wochenstunden</span>
                  <span>{c.testModel ? 'Testmodell' : `${c.plannedSchulaufgaben} SA`}</span>
                  {#if c.promotionSubject}<span>Vorrückungsfach</span>{/if}
                </div>
              </a>
              <div class="relative flex justify-end gap-1 px-3 pb-3 opacity-0 transition group-hover:opacity-100">
                <button class="btn btn-ghost h-7 px-2 text-[0.75rem]" onclick={() => { editCourse = c; courseOpen = true; }}><Icon name="edit" size={13} /> Bearbeiten</button>
                <button class="btn btn-ghost h-7 px-2 text-[0.75rem] text-rose-600" onclick={() => askRemoveCourse(c)}><Icon name="trash" size={13} /></button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <Empty icon="book" title="Noch kein Fach" text="Füge die Fächer hinzu, die du in dieser Klasse unterrichtest.">
          <button class="btn btn-primary" onclick={() => { editCourse = null; courseOpen = true; }}><Icon name="plus" size={15} /> Fach hinzufügen</button>
        </Empty>
      {/if}
    </section>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Schülerinnen und Schüler · {cls.students.length}</h2>
      </div>
      {#if students.length}
        <div class="card overflow-hidden">
          <table class="w-full text-[0.8125rem]">
            <thead class="bg-slate-50/80 text-left text-[0.6875rem] uppercase tracking-wider text-slate-400 dark:bg-white/[0.02]">
              <tr><th class="w-12 px-4 py-2.5 font-semibold">#</th><th class="px-4 py-2.5 font-semibold">Name</th><th class="px-4 py-2.5 font-semibold">Vermerk</th><th></th></tr>
            </thead>
            <tbody>
              {#each students as s, i (s.id)}
                <tr class="group border-t border-slate-100 transition hover:bg-brand-50/40 dark:border-line-dark dark:hover:bg-white/[0.03] {s.leftAt ? 'text-slate-400' : ''}">
                  <td class="px-4 py-2 tabular-nums text-slate-400">{i + 1}</td>
                  <td class="px-4 py-2">
                    <a class="font-medium hover:text-brand-600" href={href.student(cls.id, s.id)}>{s.lastName}, {s.firstName}</a>
                    {#if noteCount.get(s.id)}<span class="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" title="Pädagogische Notizen">{noteCount.get(s.id)} Notiz{noteCount.get(s.id) === 1 ? '' : 'en'}</span>{/if}
                    {#each cls.courses as c (c.id)}
                      {@const p = openPhase(c, s.id)}
                      {#if p}<span class="ml-2"><ObservationBadge phase={p} link={href.observation(cls.id, c.id, s.id)} label={subjectOf(c)?.short ?? 'Beobachtung'} /></span>{/if}
                    {/each}
                    {#if s.leftAt}<span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] dark:bg-white/10">ausgetreten {new Date(s.leftAt).toLocaleDateString('de-DE')}</span>{/if}
                  </td>
                  <td class="px-4 py-2 text-[0.75rem] text-slate-500">{s.support ?? ''}</td>
                  <td class="px-4 py-2 text-right">
                    {#if !s.leftAt && coursesOf(s).some((c) => !openPhase(c, s.id))}
                      <button class="btn btn-ghost h-7 px-2 opacity-0 transition group-hover:opacity-100" onclick={() => observe(s)} title="Unterrichtsbeobachtung starten" aria-label="Unterrichtsbeobachtung starten"><Icon name="eye" size={14} /></button>
                    {/if}
                    <button class="btn btn-ghost h-7 px-2 opacity-0 transition group-hover:opacity-100" onclick={() => openStudent(s)} aria-label="Bearbeiten"><Icon name="edit" size={14} /></button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <Empty icon="users" title="Noch niemand in der Klasse" text="Füge eine Namensliste ein, importiere eine CSV- oder Excel-Datei oder lege Schüler einzeln an.">
          <button class="btn btn-primary" onclick={() => (importOpen = true)}><Icon name="plus" size={15} /> Schüler hinzufügen</button>
        </Empty>
      {/if}
    </section>

    <section class="flex justify-end">
      <button class="btn btn-ghost text-rose-600" onclick={askRemoveClass}><Icon name="trash" size={15} /> Klasse löschen</button>
    </section>
  </div>

  <ClassDialog bind:open={editClass} {cls} />
  <CourseDialog bind:open={courseOpen} {cls} course={editCourse} />
  <ImportDialog bind:open={importOpen} {cls} />

  <Modal open={!!editStudent} title="Schüler bearbeiten" width="max-w-md" onclose={() => (editStudent = null)}>
    <form id="student-form" onsubmit={saveStudent} class="grid gap-3">
      <div class="grid grid-cols-2 gap-3">
        <label><span class="label">Nachname</span><input class="field" bind:value={studentForm.lastName} /></label>
        <label><span class="label">Vorname</span><input class="field" bind:value={studentForm.firstName} /></label>
      </div>
      <label><span class="label">Vermerk Nachteilsausgleich / Notenschutz</span><input class="field" bind:value={studentForm.support} placeholder="optional, z. B. Notenschutz LRSt" /></label>
      <label><span class="label">Austritt am</span><input class="field" type="date" bind:value={studentForm.leftAt} /></label>
    </form>
    {#snippet footer()}
      <button type="button" class="btn btn-ghost mr-auto text-rose-600" onclick={() => editStudent && askRemoveStudent(editStudent)}><Icon name="trash" size={15} /> Entfernen</button>
      <button type="button" class="btn btn-ghost" onclick={() => (editStudent = null)}>Abbrechen</button>
      <button form="student-form" class="btn btn-primary">Speichern</button>
    {/snippet}
  </Modal>

  <Modal open={!!observeFor} title="Beobachtung starten" subtitle={observeFor ? `${observeFor.firstName} ${observeFor.lastName}` : ''} width="max-w-sm" onclose={() => (observeFor = null)}>
    {#if observeFor}
      {@const st = observeFor}
      <div class="grid gap-1.5">
        {#each coursesOf(st) as c (c.id)}
          {@const p = openPhase(c, st.id)}
          <button class="btn {p ? 'btn-ghost' : 'btn-soft'} justify-between" onclick={() => { observeFor = null; if (p) go(href.observation(cls.id, c.id, st.id)); else begin(st, c); }}>
            <span>{subjectOf(c)?.name}</span>
            <span class="text-[0.75rem] font-normal text-slate-500">{p ? 'läuft – öffnen' : 'starten'}</span>
          </button>
        {/each}
      </div>
    {/if}
  </Modal>

  <Modal open={!!confirm} title="Bitte bestätigen" width="max-w-md" onclose={() => (confirm = null)}>
    <p class="text-[0.84375rem] leading-relaxed">{confirm?.text}</p>
    {#snippet footer()}
      <button class="btn btn-ghost" onclick={() => (confirm = null)}>Abbrechen</button>
      <button class="btn btn-danger" onclick={() => { confirm?.run(); confirm = null; }}>Löschen</button>
    {/snippet}
  </Modal>
{/if}
