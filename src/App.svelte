<script lang="ts">
  import { app } from './lib/state/app.svelte';
  import Setup from './views/Setup.svelte';
  import Unlock from './views/Unlock.svelte';
  import Shell from './views/Shell.svelte';
  import Onboarding from './views/Onboarding.svelte';
  import Toasts from './ui/Toasts.svelte';

  // Design: hell, dunkel oder System – vor dem Entsperren gilt das System.
  $effect(() => {
    const pref = app.phase === 'ready' && app.data ? app.core.settings.theme : 'system';
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', pref === 'dunkel' || (pref === 'system' && mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
</script>

{#if app.phase === 'loading'}
  <div class="grid min-h-dvh place-items-center">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"></div>
  </div>
{:else if app.phase === 'setup'}
  <Setup />
{:else if app.phase === 'locked'}
  <Unlock />
{:else if app.onboardingOpen && !app.publicMode}
  <Onboarding />
{:else}
  <Shell />
{/if}

<Toasts />
