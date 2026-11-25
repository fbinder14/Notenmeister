<script lang="ts">
  import { fade } from 'svelte/transition';
  import { app } from '../lib/state/app.svelte';
  import { STEPS, stepIndex } from '../lib/domain/onboarding';
  import type { OnboardingStep } from '../lib/domain/types';
  import Icon from '../ui/Icon.svelte';
  import Preview from './onboarding/Preview.svelte';
  import StepSubjects from './onboarding/StepSubjects.svelte';
  import StepYear from './onboarding/StepYear.svelte';
  import StepClasses from './onboarding/StepClasses.svelte';
  import StepCourses from './onboarding/StepCourses.svelte';
  import StepBackup from './onboarding/StepBackup.svelte';
  import StepDone from './onboarding/StepDone.svelte';

  /**
   * Einrichtungsassistent nach dem Anlegen des Tresors. Jeder Schritt schreibt
   * sofort in die echten Daten; gemerkt wird nur, wo man gerade ist.
   */

  const step = $derived<OnboardingStep>(app.core.settings.onboarding?.step ?? 'faecher');
  const index = $derived(Math.max(0, stepIndex(step)));
  const info = $derived(STEPS[index]);
  const last = STEPS.length - 1;

  const year = $derived(app.activeYear);
  const classes = $derived(app.classes.filter((c) => c.yearId === year?.id && !c.demo));

  /** Ob im Schritt schon etwas eingetragen ist – sonst heißt „Weiter“ „Überspringen“. */
  const filled = $derived.by(() => {
    switch (step) {
      case 'faecher':
        return app.core.subjects.length > 0;
      case 'klassen':
        return classes.length > 0;
      case 'unterricht':
        return classes.some((c) => c.courses.length);
      case 'sicherung':
        return !!app.folderBackup.name || !!app.lastBackupAt;
      default:
        return true;
    }
  });

  const LEADS: Record<OnboardingStep, string> = {
    faecher: 'Wähle die Fächer, für die du die Lehrbefähigung hast. Daraus wählst du später pro Klasse aus.',
    schuljahr: 'Wir haben das Schuljahr mit Ferien und Zeugnisterminen vorbereitet. Passt alles? Dann einfach weiter.',
    klassen: 'Lege deine Klassen an und übernimm die Namen – per Einfügen, als Datei oder einzeln. Oder später.',
    unterricht: 'Ordne deine Fächer den Klassen zu. Ein Klick genügt, die Vorgaben nach RSO sind schon eingetragen.',
    sicherung: 'Ein letzter, wichtiger Schritt: Richte eine Sicherung ein, damit keine Note verloren geht.',
    fertig: '',
  };

  function goTo(i: number) {
    const s = STEPS[Math.min(last, Math.max(0, i))];
    app.setOnboardingStep(s.id);
    document.getElementById('onboarding-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const next = () => goTo(index + 1);
  const back = () => goTo(index - 1);

  const saveLabel = $derived(app.saveState === 'saving' ? 'Speichert …' : app.saveState === 'error' ? 'Fehler beim Speichern' : 'Automatisch gespeichert');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  function onkey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      void app.lock();
      return;
    }
    // ⌘↵ = Weiter, auch aus Eingabefeldern heraus
    if (mod && e.key === 'Enter' && step !== 'fertig') {
      e.preventDefault();
      next();
    }
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="relative flex h-dvh flex-col overflow-hidden">
  <div class="pointer-events-none absolute -top-48 left-1/3 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400/20 via-violet-400/15 to-sky-400/15 blur-3xl"></div>

  <!-- Kopfzeile -->
  <header class="relative flex items-center gap-3 px-6 py-4 lg:px-10">
    <div class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_6px_16px_-6px_rgb(79_70_229/0.7)]">
      <Icon name="book" size={18} />
    </div>
    <div class="leading-tight">
      <div class="text-[0.9375rem] font-semibold tracking-tight text-slate-900 dark:text-white">Notenmeister</div>
      <div class="text-[0.6875rem] text-slate-500">Einrichtung</div>
    </div>
    <div class="ml-auto flex items-center gap-1">
      <span class="mr-2 hidden items-center gap-1.5 text-[0.6875rem] text-slate-400 sm:flex">
        <span class="h-1.5 w-1.5 rounded-full {app.saveState === 'error' ? 'bg-rose-500' : app.saveState === 'saving' ? 'bg-amber-400' : 'bg-emerald-500'}"></span>
        {saveLabel}
      </span>
      {#if step !== 'fertig'}
        <button type="button" class="btn btn-ghost h-8 text-[0.78125rem]" onclick={() => app.finishOnboarding()} title="Assistent beenden – alles Eingetragene bleibt erhalten">Später fertigstellen</button>
      {/if}
      <button type="button" class="btn btn-ghost h-8 px-2.5" onclick={() => app.lock()} title="Sperren ({isMac ? '⌘' : 'Strg+'}L)" aria-label="Sperren"><Icon name="lock" size={16} /></button>
    </div>
  </header>

  <!-- Fortschritt auf schmalen Fenstern -->
  <div class="relative px-6 lg:hidden">
    <div class="flex gap-1.5">
      {#each STEPS as s, i (s.id)}
        <div class="h-1 flex-1 rounded-full transition-colors duration-300 {i <= index ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/10'}"></div>
      {/each}
    </div>
    <div class="mt-1.5 text-[0.6875rem] text-slate-500">{step === 'fertig' ? info.title : `Schritt ${index + 1} von ${last} · ${info.title}`}</div>
  </div>

  <div id="onboarding-main" class="relative flex-1 overflow-y-auto">
    <div class="mx-auto grid max-w-[78rem] gap-8 px-6 pb-12 pt-4 lg:grid-cols-[13.5rem_minmax(0,1fr)_21rem] lg:px-10 lg:pt-6">
      <!-- Schrittleiste -->
      <nav class="hidden lg:block" aria-label="Schritte">
        <ol class="sticky top-2 grid gap-1">
          {#each STEPS as s, i (s.id)}
            {@const done = i < index}
            {@const current = i === index}
            <li>
              <button
                type="button"
                class="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition {current ? 'bg-white shadow-soft dark:bg-white/10' : 'hover:bg-slate-900/[0.04] dark:hover:bg-white/5'}"
                onclick={() => goTo(i)}
                aria-current={current ? 'step' : undefined}
              >
                <span
                  class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold transition {done
                    ? 'bg-brand-600 text-white'
                    : current
                      ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'bg-slate-100 text-slate-400 dark:bg-white/5'}"
                >
                  {#if done}<Icon name="check" size={13} stroke={3} />{:else}{i + 1}{/if}
                </span>
                <span class="leading-tight">
                  <span class="block text-[0.8125rem] font-medium {current ? 'text-slate-900 dark:text-white' : done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}">{s.title}</span>
                  <span class="block text-[0.6875rem] text-slate-400">{s.hint}</span>
                </span>
              </button>
            </li>
          {/each}
        </ol>
      </nav>

      <!-- Inhalt -->
      <main class="min-w-0">
        {#key step}
          <section in:fade={{ duration: 160 }} class="card p-6 shadow-lift sm:p-8">
            {#if step !== 'fertig'}
              <div class="mb-6">
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">Schritt {index + 1} von {last}</div>
                <h2 class="mt-1 text-[1.375rem] font-semibold tracking-tight text-slate-900 dark:text-white">{info.title}</h2>
                <p class="mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-slate-500">{LEADS[step]}</p>
              </div>
            {/if}

            {#if step === 'faecher'}
              <StepSubjects />
            {:else if step === 'schuljahr'}
              <StepYear />
            {:else if step === 'klassen'}
              <StepClasses />
            {:else if step === 'unterricht'}
              <StepCourses onback={back} />
            {:else if step === 'sicherung'}
              <StepBackup />
            {:else}
              <StepDone />
            {/if}

            {#if step !== 'fertig'}
              <div class="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-line-dark">
                {#if index > 0}
                  <button type="button" class="btn btn-ghost" onclick={back}><Icon name="back" size={16} /> Zurück</button>
                {/if}
                <span class="ml-auto hidden text-[0.6875rem] text-slate-400 sm:inline"><span class="kbd">{isMac ? '⌘' : 'Strg+'}↵</span></span>
                <button type="button" class="btn {filled ? 'btn-primary' : 'btn-soft'} h-10 min-w-36 px-5" onclick={next}>
                  {filled ? (index === last - 1 ? 'Abschließen' : 'Weiter') : 'Überspringen'}
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            {/if}
          </section>
        {/key}
      </main>

      <!-- Vorschau -->
      <aside class="min-w-0">
        <div class="lg:sticky lg:top-2">
          <Preview {step} />
        </div>
      </aside>
    </div>
  </div>
</div>
