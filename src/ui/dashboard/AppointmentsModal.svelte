<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../../lib/state/app.svelte';
  import { daysBetween, relativeDays } from '../../lib/domain/dashboard';
  import { isoWeek } from '../../lib/domain/rules';
  import { nextAssessmentTitle, planningHints, upcomingAppointments } from '../../lib/domain/schedule';
  import { addAssessment, courseDefaultType, courseTypes, fmtShortDate, removeAssessment, subjectOf, typeById, yearOf } from '../../lib/state/actions';
  import { href } from '../../lib/state/router.svelte';
  import { toast } from '../../lib/state/toast.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Modal from '../Modal.svelte';
  import Icon from '../Icon.svelte';
  import { SUBJECT_DOT } from '../colors';

  /**
   * Alle anstehenden Termine mit Details und ein Formular, um neue Termine
   * (Schulaufgaben, Kurzarbeiten, Tests …) einzutragen. Konflikte nach RSO
   * werden schon vor dem Speichern angezeigt.
   */
  let {
    open = $bindable(false),
    classes,
    today,
    focus = null,
    adding = false,
  }: { open?: boolean; classes: SchoolClass[]; today: string; focus?: string | null; adding?: boolean } = $props();

  let classFilter = $state('');
  let courseKey = $state('');
  let typeId = $state('');
  let title = $state('');
  let date = $state('');
  let highlight = $state<string | null>(null);
  let confirmDelete = $state<string | null>(null);
  let listEl = $state<HTMLElement | null>(null);
  let titleEl = $state<HTMLInputElement | null>(null);

  const courses = $derived(
    classes.flatMap((cls) => cls.courses.map((course) => ({ key: `${cls.id}/${course.id}`, cls, course, label: `${cls.name} · ${subjectOf(course)?.name ?? ''}` }))),
  );
  const picked = $derived(courses.find((c) => c.key === courseKey));
  const types = $derived(picked ? courseTypes(picked.course, 'assessment') : []);
  const type = $derived(types.find((t) => t.id === typeId));
  const suggestion = $derived(picked && type ? nextAssessmentTitle(picked.course, type) : '');
  const hints = $derived(
    picked && type && date ? planningHints(picked.cls, picked.course, type, date, app.core, yearOf(picked.cls), today) : [],
  );

  const all = $derived(upcomingAppointments(classes, today));
  const shown = $derived(classFilter ? all.filter((x) => x.cls.id === classFilter) : all);
  const months = $derived.by(() => {
    const out: Array<{ label: string; items: typeof shown }> = [];
    for (const it of shown) {
      const label = new Date(`${it.assessment.date}T12:00`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      if (out.at(-1)?.label !== label) out.push({ label, items: [] });
      out.at(-1)!.items.push(it);
    }
    return out;
  });

  function plusDays(iso: string, n: number): string {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function defaultType(key: string): string {
    const c = courses.find((x) => x.key === key);
    return c ? courseDefaultType(c.course, 'assessment') : '';
  }

  $effect(() => {
    if (!open) return;
    confirmDelete = null;
    highlight = focus;
    title = '';
    date = plusDays(today, 7);
    if (!courses.some((c) => c.key === courseKey)) courseKey = courses[0]?.key ?? '';
    typeId = defaultType(courseKey);
    void tick().then(() => {
      if (focus) listEl?.querySelector(`[data-id="${focus}"]`)?.scrollIntoView({ block: 'center' });
      if (adding) titleEl?.focus();
    });
  });

  function oncourse() {
    typeId = defaultType(courseKey);
  }

  function save(e: SubmitEvent) {
    e.preventDefault();
    if (!picked || !type || !date) return;
    const a = addAssessment(picked.cls, picked.course, {
      typeId: type.id,
      title: title.trim() || suggestion,
      date,
      weight: null,
      maxPoints: null,
      gradeKeyId: null,
    });
    toast.success(`${type.short} ${picked.cls.name} ${subjectOf(picked.course)?.short ?? ''} am ${fmtShortDate(date)} eingetragen.`);
    title = '';
    highlight = a.id;
    if (classFilter && classFilter !== picked.cls.id) classFilter = '';
    void tick().then(() => listEl?.querySelector(`[data-id="${a.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  function del(cls: SchoolClass, courseId: string, id: string) {
    if (confirmDelete !== id) {
      confirmDelete = id;
      return;
    }
    const course = cls.courses.find((c) => c.id === courseId);
    if (course) removeAssessment(cls, course, id);
    confirmDelete = null;
    toast.info('Termin gelöscht.');
  }

  const chip = (d: number) =>
    d === 0
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
      : d <= 2
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : d <= 7
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
          : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300';
</script>

<Modal bind:open title="Termine" subtitle="{all.length} anstehende Leistungsnachweise" width="max-w-4xl">
  <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
    <!-- Liste -->
    <div class="min-w-0">
      {#if classes.length > 1}
        <div class="mb-3 flex flex-wrap gap-1.5">
          {#each [{ id: '', name: 'Alle' }, ...classes] as c (c.id)}
            <button
              type="button"
              class="rounded-full px-2.5 py-1 text-[0.75rem] font-medium transition {classFilter === c.id
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}"
              onclick={() => (classFilter = c.id)}>{c.name}</button
            >
          {/each}
        </div>
      {/if}
      <div bind:this={listEl} class="max-h-[60vh] overflow-y-auto pr-1">
        {#each months as m (m.label)}
          <div class="sticky top-0 z-10 bg-white/95 pb-1.5 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-panel-dark/95">{m.label}</div>
          <div class="mb-4 grid gap-2">
            {#each m.items as { cls, course, assessment: a, days } (a.id)}
              {@const s = subjectOf(course)}
              {@const t = typeById(a.typeId)}
              {@const graded = course.grades.some((g) => g.assessmentId === a.id)}
              <div
                data-id={a.id}
                class="group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition {highlight === a.id
                  ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10'
                  : 'border-slate-200/80 hover:border-slate-300 dark:border-line-dark'}"
              >
                <div class="w-11 shrink-0 text-center">
                  <div class="text-[0.875rem] font-semibold tabular-nums text-slate-900 dark:text-white">{fmtShortDate(a.date)}</div>
                  <div class="text-[0.6875rem] text-slate-400">{new Date(`${a.date}T12:00`).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-white">{a.title}</span>
                    {#if t?.category === 'gross'}<span class="rounded bg-slate-100 px-1 text-[0.625rem] font-semibold uppercase text-slate-500 dark:bg-white/5">groß</span>{/if}
                  </div>
                  <div class="flex min-w-0 items-center gap-1.5 text-[0.71875rem] text-slate-500">
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full {SUBJECT_DOT[s?.color ?? 'slate']}"></span>
                    <span class="truncate" title="{cls.name} · {s?.name}">{cls.name} · {s?.short} · {t?.name.replace(/ \(.*\)$/, '')} · {isoWeek(a.date).replace(/^\d+-/, '')}</span>
                  </div>
                </div>
                <span class="whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-medium {chip(days)}">{relativeDays(days)}</span>
                <a href={href.assessment(cls.id, course.id, a.id)} onclick={() => (open = false)} class="btn btn-ghost h-7 w-7 px-0" title="Leistungsnachweis öffnen" aria-label="Leistungsnachweis öffnen">
                  <Icon name="chevron" size={15} />
                </a>
                {#if !graded}
                  <button
                    type="button"
                    class="btn h-7 px-1.5 text-[0.6875rem] {confirmDelete === a.id ? 'btn-danger' : 'btn-ghost opacity-0 group-hover:opacity-100 focus:opacity-100'}"
                    onclick={() => del(cls, course.id, a.id)}
                    title="Termin löschen"
                    aria-label="Termin löschen"
                  >
                    <Icon name="trash" size={13} />{confirmDelete === a.id ? ' Löschen?' : ''}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="py-6 text-center text-[0.8125rem] text-slate-500">Keine anstehenden Termine{classFilter ? ' in dieser Klasse' : ''}.</p>
        {/each}
      </div>
    </div>

    <!-- Eintragen -->
    <form class="h-fit rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-line-dark dark:bg-white/[0.02]" onsubmit={save}>
      <div class="mb-3 flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900 dark:text-white">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft"><Icon name="plus" size={14} stroke={2} /></span>
        Termin eintragen
      </div>
      <div class="grid gap-3">
        <label>
          <span class="label">Klasse und Fach</span>
          <select class="field" bind:value={courseKey} onchange={oncourse}>
            {#each courses as c (c.key)}<option value={c.key}>{c.label}</option>{/each}
          </select>
        </label>
        <label>
          <span class="label">Art</span>
          <select class="field" bind:value={typeId}>
            {#each types as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </select>
        </label>
        <label>
          <span class="label">Titel</span>
          <input bind:this={titleEl} class="field" bind:value={title} placeholder={suggestion} />
        </label>
        <label>
          <span class="label">Datum{#if date && date >= today}<span class="font-normal text-slate-400">&nbsp;· {relativeDays(daysBetween(today, date))}</span>{/if}</span>
          <input class="field" type="date" bind:value={date} required />
        </label>

        {#if hints.length}
          <ul class="grid gap-1.5">
            {#each hints as h, i (i)}
              <li
                class="flex gap-2 rounded-lg px-2.5 py-2 text-[0.71875rem] leading-snug {h.level === 'warn'
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
                  : 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200'}"
              >
                <Icon name={h.level === 'warn' ? 'alert' : 'info'} size={14} class="mt-px shrink-0" />
                <span>{h.text}{#if h.rule}<span class="opacity-70">&nbsp;({h.rule})</span>{/if}</span>
              </li>
            {/each}
          </ul>
        {:else if picked && type && date}
          <p class="flex items-center gap-1.5 text-[0.71875rem] text-emerald-700 dark:text-emerald-300"><Icon name="check" size={14} stroke={2} /> Keine Terminkonflikte in der {picked.cls.name}.</p>
        {/if}

        <button class="btn btn-primary w-full" disabled={!picked || !type || !date}>Termin anlegen</button>
        <p class="text-[0.6875rem] leading-snug text-slate-400">Punkte und Notenschlüssel legst du nach dem Schreiben beim Leistungsnachweis fest.</p>
      </div>
    </form>
  </div>
</Modal>
