<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { WrongPasswordError } from '../lib/crypto/vault';
  import AuthFrame from './AuthFrame.svelte';
  import Icon from '../ui/Icon.svelte';

  let pw = $state('');
  let busy = $state(false);
  let error = $state('');
  let shake = $state(false);
  let fails = $state(0);

  async function submit(e: Event) {
    e.preventDefault();
    if (!pw || busy) return;
    busy = true;
    error = '';
    try {
      await app.unlock(pw);
    } catch (err) {
      fails++;
      error = err instanceof WrongPasswordError ? 'Das Passwort ist falsch.' : (err as Error).message;
      shake = false;
      requestAnimationFrame(() => (shake = true));
      pw = '';
    } finally {
      busy = false;
    }
  }
</script>

<AuthFrame>
  <form onsubmit={submit} class="grid gap-4 {shake ? 'animate-shake' : ''}" onanimationend={() => (shake = false)}>
    <div class="flex items-center gap-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon name="lock" /></span>
      <div>
        <h2 class="text-[16px] font-semibold text-slate-900 dark:text-white">Gesperrt</h2>
        <p class="text-[13px] text-slate-500">Master-Passwort eingeben, um fortzufahren.</p>
      </div>
    </div>
    <!-- svelte-ignore a11y_autofocus -->
    <input class="field h-11 text-[15px]" type="password" placeholder="Master-Passwort" bind:value={pw} autocomplete="current-password" autofocus disabled={busy} />
    {#if error}<p class="text-[13px] text-rose-600">{error}</p>{/if}
    <button class="btn btn-primary h-11" disabled={!pw || busy}>
      {#if busy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Entschlüssele …{:else}Entsperren{/if}
    </button>
    {#if fails >= 3}
      <p class="text-center text-[12px] leading-relaxed text-slate-500">
        Passwort vergessen? Ohne Passwort lassen sich die Daten nicht entschlüsseln. Eine ältere Sicherungsdatei lässt sich nur mit ihrem damaligen Passwort öffnen.
      </p>
    {/if}
  </form>
</AuthFrame>
