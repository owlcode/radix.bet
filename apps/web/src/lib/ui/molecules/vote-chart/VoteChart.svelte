<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Filler,
    Tooltip,
    Legend
  } from 'chart.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Filler,
    Tooltip,
    Legend
  );

  export let betAddress: string;

  type DataPoint = {
    timestamp: string;
    option: string;
    optionAddress: string;
    cumulative: number;
  };

  type OptionInfo = { address: string; name: string };

  let canvasEl: HTMLCanvasElement;
  let chart: Chart | null = null;
  let loading = true;
  let hasData = false;

  // Colors pulled from the app design system for visual consistency
  const chartColors = [
    '#16c784', // --color-success (green)
    '#ea3943', // --color-danger (red)
    '#1652f0', // --color-primary (blue)
    '#f59e0b', // amber (activity feed winner events)
    '#8b5cf6', // purple (activity feed claim events)
    '#ec4899' // pink (complementary)
  ];

  const chartBgColors = [
    'rgba(22, 199, 132, 0.08)',
    'rgba(234, 57, 67, 0.08)',
    'rgba(22, 82, 240, 0.08)',
    'rgba(245, 158, 11, 0.08)',
    'rgba(139, 92, 246, 0.08)',
    'rgba(236, 72, 153, 0.08)'
  ];

  function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return Math.round(n).toString();
  }

  async function fetchAndRender() {
    loading = true;
    try {
      const res = await fetch(`/api/votes/history?bet=${betAddress}`);
      if (!res.ok) return;

      const data: { series: DataPoint[]; options: OptionInfo[] } = await res.json();
      if (data.series.length === 0) {
        hasData = false;
        return;
      }

      hasData = true;

      // Wait for next tick so canvas is in DOM
      await new Promise((r) => setTimeout(r, 0));
      buildChart(data.series, data.options);
    } catch {
      // Silent fail
    } finally {
      loading = false;
    }
  }

  function buildChart(series: DataPoint[], options: OptionInfo[]) {
    if (!canvasEl) return;

    // Build cumulative datasets per option
    // Each dataset needs {x, y} points where x = timestamp index, y = cumulative
    const optionAddresses = options.map((o) => o.address);
    const datasets: {
      label: string;
      data: { x: number; y: number }[];
      borderColor: string;
      backgroundColor: string;
    }[] = [];

    for (let i = 0; i < optionAddresses.length; i++) {
      const addr = optionAddresses[i];
      const name = options[i].name;
      const points = series
        .filter((d) => d.optionAddress === addr)
        .map((d) => ({
          x: new Date(d.timestamp).getTime(),
          y: d.cumulative
        }));

      if (points.length === 0) continue;

      datasets.push({
        label: name,
        data: points,
        borderColor: chartColors[i % chartColors.length],
        backgroundColor: chartBgColors[i % chartBgColors.length]
      });
    }

    if (datasets.length === 0) return;

    // Find the dataset with the most points for animation timing
    const maxPoints = Math.max(...datasets.map((ds) => ds.data.length));
    const totalDuration = 1500;
    const delayBetweenPoints = totalDuration / maxPoints;

    // Progressive line animation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previousY = (ctx: any) =>
      ctx.index === 0
        ? ctx.chart.scales.y.getPixelForValue(0)
        : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;

    // Read CSS variables from the DOM for consistent theming
    const style = getComputedStyle(document.documentElement);
    const textMuted = style.getPropertyValue('--color-text-muted').trim() || '#9ca3af';
    const borderLight = style.getPropertyValue('--color-border-light').trim() || '#f3f4f6';
    const bgPrimary = style.getPropertyValue('--color-bg-primary').trim() || '#ffffff';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartConfig: any = {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          x: {
            type: 'number',
            easing: 'linear',
            duration: delayBetweenPoints,
            from: NaN,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delay(ctx: any) {
              if (ctx.type !== 'data' || ctx.xStarted) return 0;
              ctx.xStarted = true;
              return ctx.index * delayBetweenPoints;
            }
          },
          y: {
            type: 'number',
            easing: 'linear',
            duration: delayBetweenPoints,
            from: previousY,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delay(ctx: any) {
              if (ctx.type !== 'data' || ctx.yStarted) return 0;
              ctx.yStarted = true;
              return ctx.index * delayBetweenPoints;
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 16,
              font: { size: 13, weight: 500 },
              color: textMuted
            }
          },
          tooltip: {
            backgroundColor: bgPrimary,
            titleColor: '#0d1421',
            bodyColor: '#6b7280',
            borderColor: borderLight,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            usePointStyle: true,
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              title(items: any[]) {
                if (!items.length) return '';
                const d = new Date(items[0].parsed.x ?? 0);
                return d.toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label(item: any) {
                return ` ${item.dataset.label ?? ''}: ${formatNumber(item.parsed.y ?? 0)} XRD`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            display: true,
            grid: { display: false },
            ticks: {
              color: textMuted,
              font: { size: 11 },
              maxTicksLimit: 6,
              callback(value: number) {
                const d = new Date(value);
                return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
              }
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              color: borderLight
            },
            border: { display: false },
            ticks: {
              color: textMuted,
              font: { size: 11 },
              maxTicksLimit: 5,
              callback(value: number) {
                return formatNumber(value);
              }
            }
          }
        },
        elements: {
          line: {
            tension: 0.3,
            borderWidth: 2.5,
            fill: true
          },
          point: {
            radius: 0,
            hoverRadius: 5,
            hoverBorderWidth: 2,
            hoverBorderColor: bgPrimary
          }
        }
      }
    };

    chart = new Chart(canvasEl, chartConfig);
  }

  onMount(fetchAndRender);

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

{#if loading}
  <div class="chart-loading">
    <div class="chart-spinner"></div>
  </div>
{:else if hasData}
  <div class="chart-container">
    <h3 class="chart-title">Vote Volume Over Time</h3>
    <div class="chart-canvas-wrapper">
      <canvas bind:this={canvasEl}></canvas>
    </div>
  </div>
{:else}
  <div class="chart-container">
    <h3 class="chart-title">Vote Volume Over Time</h3>
    <div class="chart-empty">
      <p>No votes yet. Be the first to place a bet!</p>
    </div>
  </div>
{/if}

<style lang="scss">
  .chart-container {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .chart-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-md) 0;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .chart-canvas-wrapper {
    position: relative;
    height: 240px;
    width: 100%;
  }

  .chart-loading {
    display: flex;
    justify-content: center;
    padding: var(--spacing-xl);
  }

  .chart-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .chart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin: 0;
    }
  }
</style>
