<script lang="ts">
  import { openPhase, phaseSince } from '../../lib/domain/observation';
  import { fmtShortDate, startObservation } from '../../lib/state/actions';
  import { go, href } from '../../lib/state/router.svelte';
  import type { SchoolClass } from '../../lib/domain/types';
  import Modal from '../Modal.svelte';
  import StudentSearch, { type StudentHit } from './StudentSearch.svelte';

  /**
   * „Beobachtung starten“: Name tippen, Treffer wählen, die Beobachtung
   * beginnt und die Beobachtungsmaske öffnet sich. Läuft schon eine, wird
   * sie geöffnet.
   */
  let { open = $bindable(false), classes }: { open?: boolean; classes: SchoolClass[] } = $props();

  let query = $state('');

  $effect(() => {
    if (open) query = '';
  });

  function note(h: StudentHit): string | undefined {
    const p = openPhase(h.course, h.student.id);
    return p ? `läuft seit ${fmtShortDate(phaseSince(p))}` : undefined;
  }

  function pick(h: StudentHit) {
    startObservation(h.cls, h.course, h.student.id);
    open = false;
    go(href.observation(h.cls.id, h.course.id, h.student.id));
  }
</script>

<Modal bind:open title="Beobachtung starten" width="max-w-md" bare>
  <StudentSearch {classes} bind:query onpick={pick} {note} />
</Modal>
