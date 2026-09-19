<script lang="ts">
  import { theme } from '$lib/stores/theme';

  export let series: (number | string)[];

  $: totalVotes = series.reduce((acc, value) => Number(acc) + Number(value), 0) as number;

  $: linearGradient = series
    .map((value, index) => {
      const color = $theme.colors[index];
      const currentIndexValue = Math.round((Number(value) / totalVotes) * 100) || 0;
      const previousIndexValue = Math.round((Number(series[index - 1]) / totalVotes) * 100) || 0;
      if (index === 0) {
        return `${color} ${currentIndexValue}%`;
      } else {
        return `${color} ${previousIndexValue}%, ${color} ${currentIndexValue + previousIndexValue}%`;
      }
    })
    .join(',');
</script>

<div class="line-chart" style:--bet-card-border={linearGradient}></div>

<style lang="scss">
  .line-chart {
    background: linear-gradient(to right, var(--bet-card-border));
    height: 10px;
    border-radius: 5px;
  }
</style>
