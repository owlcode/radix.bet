<script lang="ts">
  import { Timeline, Text, ThemeIcon } from '@svelteuidev/core';
  import { BetEventType, type BetEvent } from '$lib/model/bet';
  import { Icon } from 'svelte-icons-pack';
  import { LuTrophy } from 'svelte-icons-pack/lu';
  import { LuVote } from 'svelte-icons-pack/lu';
  import { LuClock8 } from 'svelte-icons-pack/lu';
  import { i18n } from '$lib/i18n';
  import { formatDate } from '$lib/ui/atoms/format-date';

  export let events: BetEvent[];

  $: activeIndex = events.findIndex((event) => new Date(event.date) > new Date()) - 1;

  const bulletSize = 36;

  const eventTypeToBulletIcon = {
    [BetEventType.End]: LuTrophy,
    [BetEventType.Start]: LuVote,
    [BetEventType.BettingClosed]: LuClock8
  };
</script>

<Timeline lineWidth={4} active={activeIndex + 1} {bulletSize}>
  {#each events as event, index}
    <Timeline.Item lineVariant="dotted" title={$i18n.t(`bet_timeline_title:${event.type}`)}>
      <svelte:fragment slot="bullet">
        <ThemeIcon color={index > activeIndex ? 'gray' : 'blue'} radius="xl" size={bulletSize}>
          <svelte:component this={Icon} src={eventTypeToBulletIcon[event.type]} size={24}
          ></svelte:component>
        </ThemeIcon>
      </svelte:fragment>
      <Text size="xs" mb="md">{formatDate(event.date)}</Text>
      <Text color="dimmed" size="sm">
        {$i18n.t(`bet_timeline_description:${event.type}`)}
      </Text>
    </Timeline.Item>
  {/each}
</Timeline>
