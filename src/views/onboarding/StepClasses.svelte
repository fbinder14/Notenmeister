<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { addClass, addDemoClass, sortStudents, updateClass } from '../../lib/state/actions';
  import { toast } from '../../lib/state/toast.svelte';
  import { demoUntouched, needsWpf, parseClassNames } from '../../lib/domain/onboarding';
  import type { SchoolClass, WpfGroup } from '../../lib/domain/types';
  import Icon from '../../ui/Icon.svelte';
  import StudentImport from '../../ui/StudentImport.svelte';

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const real = $derived(classes.filter((c) => !c.demo));
  const demo = $derived(classes.find((c) => c.demo));

  let input = $state('');
  let open = $state<string | null>(null);
  let confirmRemove = $state<string | null>(null);
  const preview = $derived(parseClassNames(input));

  function add(e: Event) {
    e.preventDefault();
    let first: SchoolClass | null = null;
    let skipped = 0;
    for (const p of preview) {
      if (classes.some((c) => c.name.toLowerCase() === p.name.toLowerCase())) {
        skipped++;
        continue;
      }
      const c = addClass(p.name, p.gradeLevel ?? 7, '');
      first ??= c;
    }
    input = '';
    if (first) open = first.id;
    if (skipped) toast.info(`${skipped} Klasse${skipped === 1 ? '' : 'n'} gab es schon.`);
  }

  function setLevel(c: SchoolClass, v: number) {
    updateClass(c, { gradeLevel: v, wpf: needsWpf(v) ? c.wpf : '' });
  }

  function remove(c: SchoolClass) {
    if (c.students.length && confirmRemove !== c.id) {
      confirmRemove = c.id;
      return;
    }
    app.removeClass(c.id);
    confirmRemove = null;
    if (open === c.id) open = null;
  }

  function imported(c: SchoolClass) {
    return (n: number, skipped: number, source: string) => {
      if (source === 'einzeln' && !skipped) return; // die Liste darunter zeigt es schon
      toast.success(`${c.name}: ${n} übernommen${skipped ? `, ${skipped} schon vorhanden` : ''}.`);
    };
  }

  function makeDemo() {
    const c = addDemoClass();
    if (c) toast.success('Beispielklasse 8x angelegt – mit erfundenen Namen und Noten.');
  }

  const WPF: Array<{ value: WpfGroup; label: string }> = [
    { value: '', label: '–' },
    { value: 'I', label: 'I' },
    { value: 'II', label: 'II' },
    { value: 'IIIa', label: 'IIIa' },
    { value: 'IIIb', label: 'IIIb' },
  ];
</script>

<div class="grid gap-5">
  <form class="grid gap-2" onsubmit={add}>
    <div class="flex gap-2">
      <!-- svelte-ignore a11y_autofocus -->
      <input class="field h-11 flex-1 text-[0.9375rem]" bind:value={input} placeholder="z. B. 8b – oder mehrere: 7a, 8b, 9c" autofocus aria-label="Klassen" />
      <button class="btn btn-primary h-11 px-5" disabled={!preview.length}><Icon name="plus" size={16} /> {preview.length > 1 ? `${preview.length} Klassen anlegen` : 'Anlegen'}</button>
    </div>
    {#if preview.length}
      <p class="text-[0.75rem] text-slate-500">
        {#each preview as p, i (p.name)}{i ? ' · ' : ''}<b class="font-medium text-slate-700 dark:text-slate-200">{p.name}</b> {p.gradeLevel ? `Jgst. ${p.gradeLevel}` : '(Jahrgangsstufe bitte prüfen)'}{/each}
      </p>
    {/if}
  </form>

  {#if real.length}
    <div class="grid gap-3">
      {#each real as c (c.id)}
        {@const isOpen = open === c.id}
        <div class="animate-fade-up overflow-hidden rounded-xl border bg-white/70 transition dark:bg-white/[0.03] {isOpen ? 'border-brand-300 shadow-soft dark:border-brand-500/40' : 'border-slate-200 dark:border-line-dark'}">
          <div class="flex flex-wrap items-center gap-3 px-4 py-3">
            <span class="min-w-12 text-[1rem] font-semibold text-slate-900 dark:text-white">{c.name}</span>
            <label class="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
              Jgst.
              <select class="field h-8 w-16 px-2" value={c.gradeLevel} onchange={(e) => setLevel(c, Number((e.target as HTMLSelectElement).value))}>
                {#each [5, 6, 7, 8, 9, 10] as g (g)}<option value={g}>{g}</option>{/each}
              </select>
            </label>
            {#if needsWpf(c.gradeLevel)}
              <div class="flex items-center gap-1.5 text-[0.75rem] text-slate-500" title="Wahlpflichtfächergruppe – bestimmt die Vorschläge für Stunden und Schulaufgaben">
                Gruppe
                <div class="inline-flex rounded-lg bg-slate-900/5 p-0.5 dark:bg-white/5">
                  {#each WPF as w (w.value)}
                    <button
                      type="button"
                      class="h-7 rounded-md px-2 text-[0.75rem] font-medium transition {c.wpf === w.value ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}"
                      onclick={() => updateClass(c, { wpf: w.value })}>{w.label}</button
                    >
                  {/each}
                </div>
              </div>
            {/if}
            <span class="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium {c.students.length ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}">
              <Icon name="users" size={13} />
              {c.students.length ? `${c.students.length} Schüler` : 'noch keine Namen'}
            </span>
            <button type="button" class="btn {isOpen ? 'btn-ghost' : 'btn-soft'} h-8" onclick={() => (open = isOpen ? null : c.id)}>
              {isOpen ? 'Schließen' : c.students.length ? 'Namen ergänzen' : 'Namen hinzufügen'}
            </button>
            <button type="button" class="btn btn-ghost h-8 px-2 {confirmRemove === c.id ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}" onclick={() => remove(c)} title="Klasse entfernen">
              {#if confirmRemove === c.id}Wirklich entfernen?{:else}<Icon name="trash" size={15} />{/if}
            </button>
          </div>
          {#if isOpen}
            <div class="grid gap-3 border-t border-slate-100 px-4 py-4 dark:border-line-dark">
              <StudentImport cls={c} inlineCommit compact onimported={imported(c)} />
              {#if c.students.length}
                <p class="text-[0.75rem] leading-relaxed text-slate-500">
                  <b class="font-medium text-slate-700 dark:text-slate-200">Schon in der Klasse:</b>
                  {sortStudents(c.students)
                    .slice(0, 12)
                    .map((s) => `${s.lastName}, ${s.firstName}`)
                    .join(' · ')}{c.students.length > 12 ? ` · und ${c.students.length - 12} weitere` : ''}
                </p>
              {/if}
              <p class="text-[0.6875rem] text-slate-400">Tipp: Aus Excel oder der Schulverwaltung einfach die Namensspalten markieren, kopieren und oben einfügen.</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid place-items-center gap-1 rounded-xl border border-dashed border-slate-200 px-6 py-8 text-center dark:border-line-dark">
      <Icon name="users" size={22} class="text-slate-300 dark:text-slate-600" />
      <p class="text-[0.8125rem] font-medium text-slate-600 dark:text-slate-300">Noch keine Klasse angelegt</p>
      <p class="text-[0.75rem] text-slate-500">Namen kannst du gleich danach einfügen, als Datei laden, einzeln tippen – oder später ergänzen.</p>
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-transparent p-4 ring-1 ring-amber-200/70 dark:from-amber-500/10 dark:ring-amber-500/20">
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Icon name="sparkles" size={17} /></span>
    <div class="min-w-0 flex-1 text-[0.8125rem] leading-snug">
      {#if demo}
        <b>Beispielklasse 8x ist angelegt.</b>
        <span class="text-slate-600 dark:text-slate-300">Erfundene Namen, ein paar Noten und ein anstehender Termin – zum gefahrlosen Ausprobieren. Du kannst sie jederzeit entfernen.</span>
      {:else}
        <b>Erst ausprobieren?</b>
        <span class="text-slate-600 dark:text-slate-300">Lege eine Beispielklasse mit erfundenen Namen und Noten an, um alles kennenzulernen. Sie ist klar markiert und mit einem Klick wieder weg.</span>
      {/if}
    </div>
    {#if demo}
      <button type="button" class="btn btn-ghost h-8" onclick={() => (demoUntouched(demo) || confirm('In der Beispielklasse wurde schon gearbeitet. Trotzdem entfernen?')) && app.removeClass(demo.id)}>Entfernen</button>
    {:else}
      <button type="button" class="btn btn-soft h-8" disabled={!app.core.subjects.length} title={app.core.subjects.length ? '' : 'Wähle zuerst ein Fach'} onclick={makeDemo}>Beispielklasse anlegen</button>
    {/if}
  </div>
</div>
