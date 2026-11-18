<script lang="ts">
  import Icon from './Icon.svelte';

  /**
   * Verdeckter Zustand eines geschützten Fensters auf der Startseite.
   * Zeigt nur Platzhalter – echte Daten stehen dabei nicht im Dokument.
   */
  let { title, text, onshow, rows = [72, 55, 64, 48, 60] }: { title: string; text: string; onshow: () => void; rows?: number[] } = $props();
</script>

<div class="pointer-events-none min-h-52 select-none blur-[3px]" aria-hidden="true">
  {#each rows as w, i (i)}
    <div class="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-line-dark">
      <div class="h-7 w-7 rounded-lg bg-slate-100 dark:bg-white/5"></div>
      <div class="flex-1 space-y-1.5">
        <div class="h-2.5 rounded-full bg-slate-200/80 dark:bg-white/10" style="width: {w}%"></div>
        <div class="h-2 rounded-full bg-slate-100 dark:bg-white/5" style="width: {w - 25}%"></div>
      </div>
      <div class="h-2 w-8 rounded-full bg-slate-100 dark:bg-white/5"></div>
    </div>
  {/each}
</div>
<div class="absolute inset-0 grid place-items-center bg-white/40 p-5 text-center dark:bg-panel-dark/40">
  <div class="max-w-72">
    <div class="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-soft dark:border-line-dark dark:bg-panel-dark">
      <Icon name="lock" size={18} />
    </div>
    <div class="text-[0.875rem] font-semibold text-slate-900 dark:text-white">{title}</div>
    <p class="mb-3 mt-1 text-[0.75rem] text-slate-500">{text}</p>
    <button class="btn btn-primary" onclick={onshow}><Icon name="eye" size={15} /> Einblenden</button>
  </div>
</div>
