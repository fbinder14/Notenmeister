<script lang="ts" generics="T extends string | number">
  let { value = $bindable(), options }: { value: T; options: Array<{ value: T; label: string }> } = $props();
</script>

<div class="inline-flex rounded-xl bg-slate-900/5 p-0.5 dark:bg-white/5" role="tablist">
  {#each options as o (o.value)}
    <button
      type="button"
      role="tab"
      aria-selected={value === o.value}
      class="h-7 rounded-[10px] px-3 text-[12.5px] font-medium transition {value === o.value
        ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}"
      onclick={() => (value = o.value)}>{o.label}</button
    >
  {/each}
</div>
