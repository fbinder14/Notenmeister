<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { addCourse, removeCourse, updateCourse } from '../../lib/state/actions';
  import { courseDefaults, courseRemovable } from '../../lib/domain/onboarding';
  import type { Course, SchoolClass, Subject } from '../../lib/domain/types';
  import Icon from '../../ui/Icon.svelte';
  import { SUBJECT_DOT } from '../../ui/colors';

  let { onback }: { onback: () => void } = $props();

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id && !c.demo));
  const subjects = $derived(app.core.subjects);
  const courseOf = (c: SchoolClass, s: Subject) => c.courses.find((k) => k.subjectId === s.id);

  let selected = $state<{ classId: string; courseId: string } | null>(null);
  const selClass = $derived(selected ? classes.find((c) => c.id === selected!.classId) : undefined);
  const selCourse = $derived(selClass?.courses.find((k) => k.id === selected!.courseId));
  const selSubject = $derived(selCourse ? subjects.find((s) => s.id === selCourse.subjectId) : undefined);
  const selDefaults = $derived(selClass && selSubject ? courseDefaults(selSubject.name, selClass.gradeLevel, selClass.wpf) : null);

  function toggle(c: SchoolClass, s: Subject) {
    const k = courseOf(c, s);
    if (k) {
      if (selected?.courseId === k.id) selected = null;
      else selected = { classId: c.id, courseId: k.id };
      return;
    }
    const d = courseDefaults(s.name, c.gradeLevel, c.wpf);
    const course = addCourse(c, s.id, d.weeklyHours, true);
    if (course.plannedSchulaufgaben !== d.plannedSchulaufgaben) updateCourse(c, course, { plannedSchulaufgaben: d.plannedSchulaufgaben });
    selected = { classId: c.id, courseId: course.id };
  }

  function remove(c: SchoolClass, k: Course) {
    if (!courseRemovable(k)) return;
    removeCourse(c, k.id);
    selected = null;
  }

  const sa = (k: Course) => (k.testModel ? 'Tests' : k.plannedSchulaufgaben ? `${k.plannedSchulaufgaben} SA` : 'ohne SA');
  const types = $derived(app.core.types.filter((t) => !t.archived));
  const bigWeight = $derived(types.find((t) => t.kind === 'schulaufgabe')?.weight ?? 2);
  const smallWeight = $derived(types.find((t) => t.kind === 'stegreifaufgabe')?.weight ?? 1);
  const keyName = $derived(app.core.gradeKeys.find((k) => k.id === app.core.settings.defaultGradeKeyId)?.name ?? '');
</script>

{#if !classes.length || !subjects.length}
  <div class="grid place-items-center gap-2 rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-line-dark">
    <Icon name="list" size={22} class="text-slate-300 dark:text-slate-600" />
    <p class="text-[0.8125rem] font-medium text-slate-600 dark:text-slate-300">
      {!subjects.length ? 'Es sind noch keine Fächer gewählt.' : 'Es ist noch keine Klasse angelegt.'}
    </p>
    <p class="text-[0.75rem] text-slate-500">Du kannst den Unterricht auch später in jeder Klasse hinzufügen.</p>
    <button type="button" class="btn btn-soft mt-1 h-8" onclick={onback}><Icon name="back" size={14} /> Zurück</button>
  </div>
{:else}
  <div class="grid gap-4">
    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-line-dark">
      <table class="w-full border-collapse text-[0.8125rem]">
        <thead>
          <tr class="bg-slate-50/80 dark:bg-white/[0.03]">
            <th class="sticky left-0 bg-slate-50 px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 dark:bg-panel-dark">Klasse</th>
            {#each subjects as s (s.id)}
              <th class="px-2 py-2.5 text-center font-semibold whitespace-nowrap" title={s.name}>
                <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full {SUBJECT_DOT[s.color]}"></span>{s.short}</span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each classes as c (c.id)}
            <tr class="border-t border-slate-100 dark:border-line-dark">
              <th class="sticky left-0 bg-white px-3 py-2 text-left whitespace-nowrap dark:bg-panel-dark">
                <span class="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                <span class="ml-1 text-[0.6875rem] font-normal text-slate-400">{c.gradeLevel}{c.wpf ? ` · ${c.wpf}` : ''}</span>
              </th>
              {#each subjects as s (s.id)}
                {@const k = courseOf(c, s)}
                {@const isSel = !!k && selected?.courseId === k.id}
                <td class="px-1.5 py-1.5 text-center">
                  {#if k}
                    <button
                      type="button"
                      class="inline-flex min-w-[6.5rem] animate-pop items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[0.71875rem] font-medium tabular-nums text-white shadow-soft transition {SUBJECT_DOT[s.color]} {isSel ? 'ring-2 ring-offset-2 ring-brand-400 dark:ring-offset-panel-dark' : 'hover:brightness-110'}"
                      onclick={() => toggle(c, s)}
                      title="Einstellungen für {s.name} in {c.name}"
                    >
                      <Icon name="check" size={12} stroke={3} /> {k.weeklyHours} Std · {sa(k)}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="inline-flex h-[1.875rem] min-w-[6.5rem] items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-line-dark dark:text-slate-600 dark:hover:bg-white/5"
                      onclick={() => toggle(c, s)}
                      aria-label="{s.name} in {c.name} hinzufügen"
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if selClass && selCourse && selSubject}
      <div class="animate-fade-up rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
        <div class="mb-3 flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full {SUBJECT_DOT[selSubject.color]}"></span>
          <span class="text-[0.875rem] font-semibold">{selSubject.name} in {selClass.name}</span>
          <button type="button" class="btn btn-ghost ml-auto h-7 px-2 text-slate-400" onclick={() => (selected = null)} aria-label="Schließen"><Icon name="x" size={14} /></button>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>
            <span class="label">Wochenstunden</span>
            <input class="field" type="number" min="1" max="10" bind:value={selCourse.weeklyHours} onchange={() => app.touch(selClass.id)} />
          </label>
          <label>
            <span class="label">Schulaufgaben</span>
            <input class="field" type="number" min="0" max="6" bind:value={selCourse.plannedSchulaufgaben} onchange={() => app.touch(selClass.id)} disabled={selCourse.testModel} />
          </label>
          <label class="col-span-2 flex items-center gap-2.5 self-end pb-2 text-[0.8125rem]">
            <input type="checkbox" class="h-4 w-4 accent-brand-600" bind:checked={selCourse.promotionSubject} onchange={() => app.touch(selClass.id)} /> Vorrückungsfach
          </label>
        </div>
        {#if selDefaults && (selDefaults.hoursFromRso || selDefaults.saFromRso)}
          <p class="mt-2 text-[0.75rem] text-slate-500">
            Vorschlag für Jgst. {selClass.gradeLevel}{selClass.wpf ? `, Gruppe ${selClass.wpf}` : ''}:
            {#if selDefaults.hoursFromRso}<b>{selDefaults.weeklyHours}</b> Std. laut Stundentafel{/if}{#if selDefaults.hoursFromRso && selDefaults.saFromRso}, {/if}{#if selDefaults.saFromRso}<b>{selDefaults.plannedSchulaufgaben}</b> Schulaufgaben laut RSO § 18 Abs. 1{/if}
          </p>
        {:else if selClass.gradeLevel >= 7 && !selClass.wpf}
          <p class="mt-2 text-[0.75rem] text-amber-700 dark:text-amber-300">Tipp: Wähle im Schritt „Klassen“ die Wahlpflichtfächergruppe, dann schlägt der Notenmeister Stunden und Schulaufgaben vor.</p>
        {/if}
        <label class="mt-3 flex items-start gap-2.5 text-[0.8125rem]">
          <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" checked={selCourse.testModel} onchange={(e) => updateCourse(selClass, selCourse, { testModel: (e.target as HTMLInputElement).checked })} />
          <span>Schulaufgaben und Stegreifaufgaben durch angesagte Tests ersetzt <span class="text-slate-500">(RSO § 18 Abs. 3)</span></span>
        </label>
        <div class="mt-3 flex justify-end">
          {#if courseRemovable(selCourse)}
            <button type="button" class="btn btn-ghost h-8 text-rose-600" onclick={() => remove(selClass, selCourse)}><Icon name="trash" size={14} /> Unterricht entfernen</button>
          {:else}
            <span class="text-[0.75rem] text-slate-400">Enthält schon Einträge – entfernen in der Klassenansicht.</span>
          {/if}
        </div>
      </div>
    {/if}

    <div class="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 text-[0.75rem] leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
      <Icon name="info" size={15} class="mt-0.5 shrink-0 text-slate-400" />
      <span>
        Für alle Fächer gilt: große Leistungsnachweise zählen <b>{bigWeight}-fach</b>, kleine <b>{smallWeight}-fach</b> (RSO § 23), Notenschlüssel
        <b>„{keyName}“</b>, bei x,50 wird zur {app.core.settings.rounding === 'mild' ? 'besseren' : 'schlechteren'} Note gerundet. Das lässt sich in den Einstellungen anpassen.
      </span>
    </div>
  </div>
{/if}
