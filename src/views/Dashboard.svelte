<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { allWarnings } from '../lib/domain/rules';
  import { subjectOf, todayIso } from '../lib/state/actions';
  import type { Ctx } from '../lib/domain/grading';
  import { href } from '../lib/state/router.svelte';
  import PageHeader from '../ui/PageHeader.svelte';
  import Icon from '../ui/Icon.svelte';
  import Empty from '../ui/Empty.svelte';
  import WarningList from '../ui/WarningList.svelte';
  import Logbook from '../ui/Logbook.svelte';
  import ObservationsPanel from '../ui/ObservationsPanel.svelte';
  import Appointments from '../ui/dashboard/Appointments.svelte';
  import PendingGrades from '../ui/dashboard/PendingGrades.svelte';
  import MakeupsPanel from '../ui/dashboard/MakeupsPanel.svelte';
  import AtRiskPanel from '../ui/dashboard/AtRiskPanel.svelte';
  import ReportCountdown from '../ui/dashboard/ReportCountdown.svelte';
  import QuickActions from '../ui/dashboard/QuickActions.svelte';
  import BackupCard from '../ui/dashboard/BackupCard.svelte';
  import YearBar from '../ui/dashboard/YearBar.svelte';
  import Widget from '../ui/Widget.svelte';
  import { SUBJECT_GRADIENT } from '../ui/colors';

  let { onnewclass }: { onnewclass: () => void } = $props();

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id));
  const today = todayIso();
  const warnings = $derived(allWarnings(classes, app.core, today));
  const ctx = $derived<Ctx | null>(year ? { types: new Map(app.core.types.map((t) => [t.id, t])), year } : null);

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
    <div class="grid gap-4">
      {#if year}<YearBar {year} {today} />{/if}
      <QuickActions {classes} {ctx} />
    </div>

    <div class="grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
      <div class="grid gap-7">
        <Appointments {classes} {today} />
        <PendingGrades {classes} {today} />
        <Logbook {classes} />
        <Widget id="unterrichte" title="Meine Unterrichte" badge={recent.length || null}>
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
        </Widget>
      </div>

      <div class="grid gap-7">
        {#if ctx}<ReportCountdown {classes} {ctx} {today} />{/if}
        <ObservationsPanel {classes} />
        <MakeupsPanel {classes} {today} />
        {#if ctx}<AtRiskPanel {classes} {ctx} {today} />{/if}
        <BackupCard />
        <Widget id="hinweise" title="Hinweise nach RSO" badge={warnings.length || null}>
          <WarningList {warnings} />
        </Widget>
      </div>
    </div>
  {/if}
</div>
