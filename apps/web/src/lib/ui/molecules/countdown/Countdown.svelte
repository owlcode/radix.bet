<script lang="ts">
  import { onMount } from 'svelte';

  export let date: string | Date | undefined;

  let expired = false;

  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };

  function update() {
    if (date === undefined) return;
    const now = Date.now();
    const countDownDate = new Date(date).getTime();
    const distance = countDownDate - now;

    if (distance < 0) {
      expired = true;
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }

    timeLeft = {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000)
    };
  }

  update();

  onMount(() => {
    const interval = setInterval(() => {
      update();
      if (expired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

{#if !date}
  n/a
{:else if expired}
  Ended
{:else}
  {#if timeLeft.days > 0}{timeLeft.days}d {/if}{#if timeLeft.hours > 0}{timeLeft.hours}h {/if}{#if timeLeft.minutes > 0}{timeLeft.minutes}m {/if}{timeLeft.seconds}s
{/if}
