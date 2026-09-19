<script lang="ts">
  import FeaturedBets from '$lib/ui/organisms/featured-bets/FeaturedBets.svelte';
  import ActivityFeed from '$lib/ui/organisms/activity-feed/ActivityFeed.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  $: stats = data.stats;
</script>

<svelte:head>
  <title>radix.bet - Prediction Markets on Radix</title>
  <meta
    name="description"
    content="The first prediction market platform on the Radix blockchain. Trade on politics, sports, crypto, and more with XRD."
  />
</svelte:head>

<main>
  <div class="stats-bar">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <span class="stat-val">{stats.activeBets}</span>
        <span class="stat-lbl">Active Markets</span>
      </div>
      <span class="stat-divider"></span>
      <div class="stat-item">
        <span class="stat-val">{stats.totalVotes}</span>
        <span class="stat-lbl">Total Bets</span>
      </div>
      {#each stats.volumes as vol}
        <span class="stat-divider"></span>
        <div class="stat-item">
          <span class="stat-val"
            >{vol.total}
            <a
              href={vol.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="token-link">{vol.symbol}</a
            ></span
          >
          <span class="stat-lbl">Volume</span>
        </div>
      {/each}
    </div>
  </div>

  <div id="markets" class="markets-layout">
    <div class="markets-main">
      <FeaturedBets
        initialBets={data.bets}
        initialTotal={data.total}
        status={data.status}
        sort={data.sort}
        searchQuery={data.search}
      />
    </div>
    <aside class="markets-sidebar">
      <ActivityFeed limit={15} />
    </aside>
  </div>
</main>

<style lang="scss">
  main {
    min-height: calc(100vh - 56px);
  }

  .stats-bar {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-primary);
  }

  .stats-bar-inner {
    padding: 12px var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .stat-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .stat-val {
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .stat-lbl {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .token-link {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .stat-divider {
    width: 1px;
    height: 16px;
    background: var(--color-border);
  }

  .markets-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--spacing-lg);
    padding: 0 var(--spacing-lg);
  }

  .markets-main {
    min-width: 0;
  }

  .markets-sidebar {
    padding-top: var(--spacing-xl);
    position: sticky;
    top: 72px;
    align-self: start;
  }

  @media (max-width: 1024px) {
    .markets-layout {
      grid-template-columns: 1fr;
    }

    .markets-sidebar {
      position: static;
    }
  }

  @media (max-width: 768px) {
    .stats-bar-inner {
      padding: 10px var(--spacing-md);
      gap: var(--spacing-md);
    }

    .stat-item {
      flex-direction: column;
      gap: 0;
    }

    .stat-val {
      font-size: var(--font-size-sm);
    }

    .stat-lbl {
      font-size: 10px;
    }

    .markets-layout {
      padding: 0 var(--spacing-sm);
    }
  }
</style>
