<script lang="ts">
  import { app } from '../../lib/state/app.svelte';
  import { hasBavarianTable } from '../../lib/domain/calendar';
  import Icon from '../../ui/Icon.svelte';
  import YearEditor from '../../ui/YearEditor.svelte';

  const year = $derived(app.activeYear);
  const fromTable = $derived(year ? hasBavarianTable(Number(year.start.slice(0, 4))) : false);
</script>

{#if year}
  <div class="grid gap-4">
    {#if fromTable}
      <div class="flex items-start gap-3 rounded-xl bg-emerald-50 p-3.5 text-[0.8125rem] leading-snug text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
        <Icon name="sparkles" size={17} class="mt-0.5 shrink-0" />
        <span>
          <b>Schon vorausgefüllt</b> nach der bayerischen Ferienordnung und den Zeugnisterminen des Kultusministeriums.
          Den <b>Notenschluss</b> legt deine Schule fest – wir haben zwei Wochen vor dem Zeugnis vorgeschlagen. Bitte mit dem Terminplan deiner Schule abgleichen.
        </span>
      </div>
    {:else}
      <div class="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-[0.8125rem] leading-snug text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
        <Icon name="info" size={17} class="mt-0.5 shrink-0" />
        <span>Für dieses Schuljahr sind keine amtlichen Termine hinterlegt. Bitte trage die Termine deiner Schule ein.</span>
      </div>
    {/if}
    <YearEditor {year} onchange={() => app.touch()} />
  </div>
{/if}
