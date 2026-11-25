<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { demoUntouched, gettingStarted, type ChecklistItem } from '../../lib/domain/onboarding';
  import { href } from '../../lib/state/router.svelte';
  import { toast } from '../../lib/state/toast.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Icon from '../Icon.svelte';

  /**
   * „Erste Schritte“ nach dem Einrichtungsassistenten: Häkchen ergeben sich aus den
   * Daten (ohne Beispielklasse). Verschwindet, wenn alles erledigt oder ausgeblendet ist.
   */
  let { classes, onnewclass }: { classes: SchoolClass[]; onnewclass: () => void } = $props();

  const onboarding = $derived(app.core.settings.onboarding);
  const items = $derived(gettingStarted(classes, !!app.folderBackup.name || !!app.lastBackupAt));
  const done = $derived(items.filter((i) => i.done).length);
  const demo = $derived(classes.find((c) => c.demo));
  const visible = $derived(!!onboarding && !onboarding.checklistDismissedAt && (done < items.length || !!demo));

  const real = $derived(classes.filter((c) => !c.demo));
  const firstClass = $derived(real[0]);
  const firstCourse = $derived(real.flatMap((c) => c.courses.map((k) => ({ c, k })))[0]);

  function link(i: ChecklistItem): string | null {
    switch (i.id) {
      case 'klasse':
        return null;
      case 'schueler':
      case 'unterricht':
        return firstClass ? href.cls(firstClass.id) : null;
      case 'termin':
        return firstCourse ? href.course(firstCourse.c.id, firstCourse.k.id) : null;
      case 'note':
        return firstCourse ? href.quick(firstCourse.c.id, firstCourse.k.id) : null;
      case 'sicherung':
        return href.settings();
    }
  }

  function removeDemo() {
    if (!demo) return;
    if (!demoUntouched(demo) && !confirm('In der Beispielklasse wurde schon gearbeitet. Trotzdem entfernen?')) return;
    app.removeClass(demo.id);
    toast.success('Beispielklasse entfernt.');
  }
</script>

{#if visible}
  <div class="card relative animate-fade-up overflow-hidden">
    <div class="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-brand-400/25 to-violet-400/20 blur-2xl"></div>
    <div class="relative flex flex-wrap items-center gap-4 px-5 pt-4">
      <div class="relative grid h-11 w-11 place-items-center">
        <svg viewBox="0 0 36 36" class="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3.5" class="stroke-slate-200 dark:stroke-white/10" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3.5" stroke-linecap="round" class="stroke-brand-500 transition-all duration-500" stroke-dasharray="{(done / items.length) * 97.4} 97.4" />
        </svg>
        <span class="text-[0.6875rem] font-semibold tabular-nums">{done}/{items.length}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[0.9375rem] font-semibold text-slate-900 dark:text-white">Erste Schritte</div>
        <div class="text-[0.75rem] text-slate-500">{done === items.length ? 'Alles erledigt – viel Erfolg im Schuljahr!' : 'Ein paar Handgriffe, dann läuft der Notenmeister rund.'}</div>
      </div>
      <button class="btn btn-ghost h-8 text-[0.75rem] text-slate-500" onclick={() => app.dismissChecklist()}>Ausblenden</button>
    </div>
    <div class="relative grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each items as i (i.id)}
        {@const to = link(i)}
        {#if i.done}
          <div class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.8125rem] text-slate-400">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Icon name="check" size={12} stroke={3} /></span>
            <span class="line-through decoration-slate-300 dark:decoration-slate-600">{i.label}</span>
          </div>
        {:else if i.id === 'klasse'}
          <button class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-left text-[0.8125rem] font-medium transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-line-dark dark:bg-white/[0.03]" onclick={onnewclass}>
            <span class="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></span>{i.label}<Icon name="chevron" size={14} class="ml-auto text-slate-300" />
          </button>
        {:else}
          <a href={to ?? href.dashboard()} class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[0.8125rem] font-medium transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-line-dark dark:bg-white/[0.03] {to ? '' : 'pointer-events-none opacity-50'}">
            <span class="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></span>{i.label}<Icon name="chevron" size={14} class="ml-auto text-slate-300" />
          </a>
        {/if}
      {/each}
    </div>
    {#if demo}
      <div class="relative flex flex-wrap items-center gap-3 border-t border-slate-100 bg-amber-50/60 px-5 py-3 text-[0.8125rem] dark:border-line-dark dark:bg-amber-500/5">
        <Icon name="sparkles" size={16} class="text-amber-600 dark:text-amber-300" />
        <span class="flex-1">Die <a class="font-semibold underline decoration-amber-300 underline-offset-2" href={href.cls(demo.id)}>Beispielklasse {demo.name}</a> enthält erfundene Namen und Noten zum Ausprobieren.</span>
        <button class="btn btn-ghost h-8" onclick={removeDemo}><Icon name="trash" size={14} /> Entfernen</button>
      </div>
    {/if}
  </div>
{/if}
