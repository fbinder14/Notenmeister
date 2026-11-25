<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { addSubject, removeSubject, subjectInUse } from '../../lib/state/actions';
  import { ONBOARDING_SUBJECTS, suggestShort } from '../../lib/domain/onboarding';
  import Icon from '../../ui/Icon.svelte';
  import { SUBJECT_DOT } from '../../ui/colors';

  const subjects = $derived(app.core.subjects);
  const byName = (name: string) => subjects.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  const custom = $derived(subjects.filter((s) => !ONBOARDING_SUBJECTS.some((x) => x.name.toLowerCase() === s.name.toLowerCase())));

  function toggle(name: string, short: string) {
    const s = byName(name);
    if (!s) addSubject(name, short);
    else if (!subjectInUse(s.id)) removeSubject(s.id);
  }

  let name = $state('');
  let short = $state('');
  let shortTouched = $state(false);
  const autoShort = $derived(suggestShort(name));

  function addCustom(e: Event) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (!byName(n)) addSubject(n, shortTouched && short.trim() ? short : autoShort);
    name = '';
    short = '';
    shortTouched = false;
  }
</script>

<div class="grid gap-5">
  <div class="flex flex-wrap gap-2">
    {#each ONBOARDING_SUBJECTS as o (o.name)}
      {@const s = byName(o.name)}
      {@const locked = !!s && subjectInUse(s.id)}
      <button
        type="button"
        class="group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition active:scale-[0.97] {s
          ? 'border-brand-300 bg-brand-50 text-brand-800 shadow-soft dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200'
          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-brand-200 hover:bg-brand-50/50 hover:text-slate-900 dark:border-line-dark dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/5'}"
        aria-pressed={!!s}
        disabled={locked}
        title={locked ? 'Wird schon im Unterricht verwendet' : ''}
        onclick={() => toggle(o.name, o.short)}
      >
        {#if s}
          <span class="grid h-4 w-4 animate-pop place-items-center rounded-full {SUBJECT_DOT[s.color] ?? 'bg-brand-500'} text-white"><Icon name="check" size={11} stroke={3} /></span>
        {:else}
          <span class="h-4 w-4 rounded-full border-2 border-slate-300 transition group-hover:border-brand-300 dark:border-slate-600"></span>
        {/if}
        {o.name}
      </button>
    {/each}
    {#each custom as s (s.id)}
      {@const locked = subjectInUse(s.id)}
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-2 text-[0.8125rem] font-medium text-brand-800 shadow-soft transition dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200"
        aria-pressed="true"
        disabled={locked}
        onclick={() => !locked && removeSubject(s.id)}
      >
        <span class="grid h-4 w-4 place-items-center rounded-full {SUBJECT_DOT[s.color] ?? 'bg-brand-500'} text-white"><Icon name="check" size={11} stroke={3} /></span>
        {s.name} <span class="text-[0.6875rem] font-normal opacity-70">{s.short}</span>
      </button>
    {/each}
  </div>

  <form class="grid gap-2 rounded-xl border border-dashed border-slate-200 p-4 dark:border-line-dark" onsubmit={addCustom}>
    <span class="text-[0.8125rem] font-medium">Fach nicht dabei?</span>
    <div class="grid grid-cols-[1fr_6rem_auto] gap-2">
      <input class="field" bind:value={name} placeholder="z. B. Darstellendes Spiel" aria-label="Name des Fachs" />
      <input
        class="field"
        value={shortTouched ? short : autoShort}
        oninput={(e) => {
          short = (e.target as HTMLInputElement).value;
          shortTouched = true;
        }}
        placeholder="Kürzel"
        aria-label="Kürzel"
      />
      <button class="btn btn-soft" disabled={!name.trim()}><Icon name="plus" size={15} /> Hinzufügen</button>
    </div>
  </form>

  <p class="flex items-center gap-2 text-[0.75rem] text-slate-500">
    <Icon name="info" size={14} /> Jedes Fach bekommt automatisch eine eigene Farbe. Ändern kannst du alles später in den Einstellungen.
  </p>
</div>
