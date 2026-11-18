<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { allWarnings } from '../lib/domain/rules';
  import { fmtShortDate, subjectOf, todayIso, typeById } from '../lib/state/actions';
  import { href } from '../lib/state/router.svelte';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import WarningList from '../ui/WarningList.svelte';
  import Logbook from '../ui/Logbook.svelte';
  import ObservationsPanel from '../ui/ObservationsPanel.svelte';
  import { SUBJECT_GRADIENT } from '../ui/colors';

  let { onnewclass }: { onnewclass: () => void } = $props();

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const today = todayIso();
  const warnings = $derived(allWarnings(classes, app.core, today));
  const upcoming = $derived(
    classes
      .flatMap((cls) => cls.courses.flatMap((course) => course.assessments.map((a) => ({ cls, course, a }))))
      .filter((x) => x.a.date >= today)
      .sort((a, b) => a.a.date.localeCompare(b.a.date))
      .slice(0, 6),
  );

  const recent = $derived(
    classes
      .flatMap((cls) => cls.courses.map((course) => ({ cls, course, last: course.grades.reduce((m, g) => (g.recordedAt > m ? g.recordedAt : m), '') })))
      .sort((a, b) => b.last.localeCompare(a.last)),
  );

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
</script>

<PageHeader title={greeting} eyebrow={new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />

<div class="mx-auto grid max-w-6xl gap-6 px-8 py-7">
  {#if !classes.length}
    <Empty icon="users" title="Noch keine Klassen" text="Lege deine erste Klasse an und füge Schülerinnen und Schüler sowie deine Fächer hinzu.">
      <button class="btn btn-primary" onclick={onnewclass}><Icon name="plus" size={15} /> Klasse anlegen</button>
    </Empty>
  {:else}
    <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <div class="mb-7"><Logbook {classes} /></div>
        <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Meine Unterrichte</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each recent as { cls, course, last } (course.id)}
            {@const s = subjectOf(course)}
            {@const g = SUBJECT_GRADIENT[s?.color ?? 'slate'] ?? SUBJECT_GRADIENT.slate}
            <a href={href.course(cls.id, course.id)} class="card group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <div class="absolute inset-0 bg-gradient-to-br {g.bg}"></div>
              <div class="absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl {g.orb} opacity-70 transition duration-300 group-hover:scale-110 group-hover:opacity-100"></div>
              <div class="relative">
                <div class="flex items-center justify-between">
                  <span class="text-[0.75rem] font-semibold uppercase tracking-wide {g.text}">{s?.short}</span>
                  <Icon name="chevron" size={16} class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </div>
                <div class="mt-1 truncate text-[0.9375rem] font-semibold text-slate-900 dark:text-white" title="{cls.name} · {s?.name}">{cls.name} · {s?.name}</div>
                <div class="mt-2 flex gap-3 text-[0.75rem] text-slate-500">
                  <span>{course.assessments.length} Leistungsnachweise</span>
                  <span>{course.grades.length} Noten</span>
                </div>
                {#if last}<div class="mt-1 text-[0.6875rem] text-slate-400">Zuletzt erfasst {new Date(last).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</div>{/if}
              </div>
            </a>
          {:else}
            <p class="text-[0.8125rem] text-slate-500">Noch keine Fächer. Öffne eine Klasse und füge ein Fach hinzu.</p>
          {/each}
        </div>

        {#if upcoming.length}
          <h2 class="mb-3 mt-7 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Anstehend</h2>
          <div class="card divide-y divide-slate-100 dark:divide-line-dark">
            {#each upcoming as { cls, course, a } (a.id)}
              <a href={href.assessment(cls.id, course.id, a.id)} class="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <div class="w-14 text-center">
                  <div class="text-[0.9375rem] font-semibold tabular-nums text-slate-900 dark:text-white">{fmtShortDate(a.date)}</div>
                  <div class="text-[0.6875rem] text-slate-400">{new Date(`${a.date}T12:00`).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[0.8125rem] font-medium">{a.title}</div>
                  <div class="truncate text-[0.75rem] text-slate-500">{cls.name} · {subjectOf(course)?.name} · {typeById(a.typeId)?.short}</div>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </section>

      <section>
        <div class="mb-7"><ObservationsPanel {classes} /></div>
        <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-400">Hinweise nach RSO</h2>
        <WarningList {warnings} />
      </section>
    </div>
  {/if}
</div>
