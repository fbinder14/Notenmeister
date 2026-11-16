<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  let { children, wide = false }: { children: Snippet; wide?: boolean } = $props();
</script>

<div class="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
  <div class="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400/25 via-violet-400/20 to-sky-400/20 blur-3xl"></div>
  <div class="relative w-full {wide ? 'max-w-xl' : 'max-w-md'} animate-fade-up">
    <div class="mb-7 flex flex-col items-center text-center">
      <div class="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_12px_30px_-8px_rgb(79_70_229/0.6)]">
        <Icon name="book" size={26} />
      </div>
      <h1 class="text-[1.375rem] font-semibold tracking-tight text-slate-900 dark:text-white">Notenmeister</h1>
      <p class="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-slate-500">
        <Icon name="shield" size={14} /> Lokal und mit AES-256 verschlüsselt
      </p>
    </div>
    <div class="card p-7 shadow-lift">
      {@render children()}
    </div>
  </div>
</div>
