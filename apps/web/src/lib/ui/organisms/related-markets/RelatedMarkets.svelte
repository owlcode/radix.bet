<script lang="ts">
  import { onMount } from 'svelte';

  export let currentAddress: string;
  export let category: string | undefined = undefined;

  interface MarketPreview {
    componentAddress: string;
    name: string;
    totalVolume: number;
    enrichedStatus: string;
  }

  let markets: MarketPreview[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const params = new URLSearchParams({ limit: '5' });
      if (category) params.set('category', category);
      const res = await fetch(`/api/bets?${params}`);
      if (res.ok) {
        const data = await res.json();
        markets = (data.bets || [])
          .filter((b: MarketPreview) => b.componentAddress !== currentAddress)
          .slice(0, 4);
      }
    } catch (e) {
      console.error('Failed to load related markets:', e);
    } finally {
      loading = false;
    }
  });

  function formatVolume(vol: number): string {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toFixed(0);
  }
</script>

{#if !loading && markets.length > 0}
  <section class="related-section">
    <h3 class="related-title">Related Markets</h3>
    <div class="related-list">
      {#each markets as market}
        <a href="/bet/{market.componentAddress}" class="related-item">
          <span class="related-name">{market.name}</span>
          <span class="related-volume">{formatVolume(market.totalVolume)} XRD</span>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style lang="scss">
  .related-section {
    width: 100%;
    max-width: 514px;
    margin: 0 auto;
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
  }

  .related-title {
    font-size: var(--font-size-md, 16px);
    font-weight: 600;
    color: var(--color-text-primary, #111827);
    margin: 0;
    padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .related-list {
    display: flex;
    flex-direction: column;
  }

  .related-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm, 12px) var(--spacing-lg, 24px);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border-light, #f3f4f6);
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #f9fafb);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .related-name {
    font-size: var(--font-size-sm, 14px);
    font-weight: 500;
    color: var(--color-text-primary, #111827);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  }

  .related-volume {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #9ca3af);
    font-weight: 500;
    flex-shrink: 0;
  }
</style>
