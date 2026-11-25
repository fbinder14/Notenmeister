<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { MIN_PASSWORD_LENGTH, WrongPasswordError } from '../lib/crypto/vault';
  import { toast } from '../lib/state/toast.svelte';
  import AuthFrame from './AuthFrame.svelte';
  import Icon from '../ui/Icon.svelte';

  let step = $state<'start' | 'password' | 'import'>('start');
  let pw = $state('');
  let pw2 = $state('');
  let show = $state(false);
  let ack = $state(false);
  let busy = $state(false);
  let error = $state('');

  let importText = $state<string | null>(null);
  let importName = $state('');
  let importPw = $state('');

  const strength = $derived.by(() => {
    let s = 0;
    if (pw.length >= MIN_PASSWORD_LENGTH) s++;
    if (pw.length >= 16) s++;
    if (/[a-zäöüß]/.test(pw) && /[A-ZÄÖÜ]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^\wäöüßÄÖÜ]/.test(pw)) s++;
    return Math.min(4, s);
  });
  const valid = $derived(pw.length >= MIN_PASSWORD_LENGTH && pw === pw2 && ack);

  async function create(e: Event) {
    e.preventDefault();
    if (!valid) return;
    busy = true;
    error = '';
    try {
      await app.setup(pw);
      toast.success('Tresor angelegt. Jetzt richten wir alles ein.');
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }

  async function pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    importName = f.name;
    importText = await f.text();
  }

  async function restore(e: Event) {
    e.preventDefault();
    if (!importText) return;
    busy = true;
    error = '';
    try {
      await app.importBackup(importText, importPw);
      toast.success('Sicherung wiederhergestellt.');
    } catch (err) {
      error = err instanceof WrongPasswordError ? 'Das Passwort passt nicht zu dieser Sicherung.' : (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<AuthFrame>
  {#if step === 'start'}
    <h2 class="text-[1.0625rem] font-semibold text-slate-900 dark:text-white">Willkommen beim Notenmeister</h2>
    <p class="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-500">In etwa fünf Minuten ist alles startklar: Fächer, Schuljahr, Klassen und Unterricht.</p>
    <ul class="mt-5 grid gap-2.5">
      {#each [
        { icon: 'lock', title: 'Verschlüsselt', text: 'Alles wird mit deinem Master-Passwort verschlüsselt.' },
        { icon: 'shield', title: 'Nur auf diesem Computer', text: 'Keine Cloud, kein Konto, keine Übertragung ins Internet.' },
        { icon: 'zap', title: 'Funktioniert offline', text: 'Auch ohne WLAN im Klassenzimmer.' },
      ] as p (p.title)}
        <li class="flex items-start gap-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon name={p.icon as 'lock'} size={16} /></span>
          <span class="text-[0.8125rem] leading-snug"><b class="font-semibold text-slate-900 dark:text-white">{p.title}</b><br /><span class="text-slate-500">{p.text}</span></span>
        </li>
      {/each}
    </ul>
    <div class="mt-6 grid gap-3">
      <button class="btn btn-primary h-11 justify-between px-4" onclick={() => (step = 'password')}>
        <span class="flex items-center gap-2"><Icon name="sparkles" size={16} /> Neu einrichten</span>
        <Icon name="chevron" size={16} />
      </button>
      <button class="btn btn-soft h-11 justify-between px-4" onclick={() => (step = 'import')}>
        <span class="flex items-center gap-2"><Icon name="upload" size={16} /> Aus Sicherung wiederherstellen</span>
        <Icon name="chevron" size={16} />
      </button>
    </div>
  {:else if step === 'password'}
    <form onsubmit={create} class="grid gap-5">
      <div>
        <h2 class="text-[1.0625rem] font-semibold text-slate-900 dark:text-white">Master-Passwort festlegen</h2>
        <p class="mt-1 text-[0.8125rem] text-slate-500">Damit werden alle Daten verschlüsselt. Mindestens {MIN_PASSWORD_LENGTH} Zeichen.</p>
      </div>
      <div class="grid gap-3">
        <div class="relative">
          <!-- svelte-ignore a11y_autofocus -->
          <input class="field h-11 pr-11" type={show ? 'text' : 'password'} placeholder="Passwort" bind:value={pw} autocomplete="new-password" autofocus />
          <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600" onclick={() => (show = !show)} aria-label="Passwort anzeigen">
            <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
          </button>
        </div>
        <div class="flex gap-1.5">
          {#each [0, 1, 2, 3] as i (i)}
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                class="h-full rounded-full transition-all duration-300 {i < strength ? (strength < 2 ? 'w-full bg-rose-400' : strength < 3 ? 'w-full bg-amber-400' : 'w-full bg-emerald-500') : 'w-0'}"
              ></div>
            </div>
          {/each}
        </div>
        <input class="field h-11" type={show ? 'text' : 'password'} placeholder="Passwort wiederholen" bind:value={pw2} autocomplete="new-password" />
        {#if pw2 && pw !== pw2}<p class="text-[0.75rem] text-rose-600">Die Passwörter stimmen nicht überein.</p>{/if}
      </div>

      <label class="flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-[0.8125rem] leading-snug text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
        <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" bind:checked={ack} />
        <span>Ich habe verstanden: Ohne dieses Passwort sind die Daten <b>unwiederbringlich verloren</b>. Es gibt keine Wiederherstellung.</span>
      </label>

      {#if error}<p class="text-[0.8125rem] text-rose-600">{error}</p>{/if}
      <div class="flex justify-between gap-2">
        <button type="button" class="btn btn-ghost" onclick={() => (step = 'start')}><Icon name="back" size={16} /> Zurück</button>
        <button class="btn btn-primary min-w-40" disabled={!valid || busy}>
          {#if busy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Verschlüssele …{:else}Tresor anlegen und weiter{/if}
        </button>
      </div>
    </form>
  {:else}
    <form onsubmit={restore} class="grid gap-4">
      <div>
        <h2 class="text-[1.0625rem] font-semibold text-slate-900 dark:text-white">Sicherung wiederherstellen</h2>
        <p class="mt-1 text-[0.8125rem] text-slate-500">Datei <code>.notenmeister</code> wählen und das Passwort eingeben, das beim Export galt.</p>
      </div>
      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-[0.8125rem] text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-line-dark dark:hover:bg-white/5">
        <Icon name="upload" size={22} class="text-brand-500" />
        {importName || 'Datei auswählen'}
        <input type="file" accept=".notenmeister,application/json" class="hidden" onchange={pick} />
      </label>
      <input class="field h-11" type="password" placeholder="Passwort der Sicherung" bind:value={importPw} autocomplete="current-password" />
      {#if error}<p class="text-[0.8125rem] text-rose-600">{error}</p>{/if}
      <div class="flex justify-between gap-2">
        <button type="button" class="btn btn-ghost" onclick={() => (step = 'start')}><Icon name="back" size={16} /> Zurück</button>
        <button class="btn btn-primary min-w-40" disabled={!importText || !importPw || busy}>
          {#if busy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Entschlüssele …{:else}Wiederherstellen{/if}
        </button>
      </div>
    </form>
  {/if}
</AuthFrame>
