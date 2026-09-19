<script lang="ts">
  import Bet from '../bet/Bet.svelte';
  import { goto } from '$app/navigation';
  import {
    betApiServiceFactory,
    defaultSortFor,
    transformApiBet,
    type BetStatus,
    type BetSort
  } from '$lib/api/bets';
  import type { BetDefinition, CurrencyInfo } from '$lib/model/bet';
  import { config } from '$lib/config';

  export let initialBets: BetDefinition[] = [];
  export let initialTotal: number = 0;
  export let status: BetStatus = 'ACTIVE';
  export let sort: BetSort = 'ending_soon';
  export let searchQuery: string = '';

  const PAGE_SIZE = 24;

  const statusFilters: Array<{ key: BetStatus; label: string }> = [
    { key: 'ACTIVE', label: 'Active' },
    { key: 'VOTING_CLOSED', label: 'Waiting Resolution' },
    { key: 'ENDED', label: 'Ended' }
  ];

  const sortOptions: Array<{ key: BetSort; label: string }> = [
    { key: 'newest', label: 'Newest' },
    { key: 'ending_soon', label: 'Ending Soon' },
    { key: 'deadline_desc', label: 'Recently Closed' },
    { key: 'volume', label: 'Top Volume' }
  ];

  let additionalBets: BetDefinition[] = [];
  let loadingMore = false;
  let loadMoreError = '';

  // Map of currency address → resolved CurrencyInfo for tokens not in the static registry
  let resolvedCurrencies: Record<string, CurrencyInfo> = {};
  // Set of addresses we've already attempted to resolve (avoids duplicate requests)
  const resolvingAddresses = new Set<string>();

  // Reset additional bets and resolved currencies when filter/sort/search changes
  let prevKey = '';
  $: {
    const key = `${status}:${sort}:${searchQuery}`;
    if (key !== prevKey) {
      prevKey = key;
      additionalBets = [];
      resolvedCurrencies = {};
      resolvingAddresses.clear();
    }
  }

  $: allBets = [...initialBets, ...additionalBets];
  $: hasMore = allBets.length < initialTotal;

  // Enrich bets with resolved currency infos from the gateway fallback
  $: displayBets = allBets.map((b) =>
    b.currencyInfo ? b : { ...b, currencyInfo: resolvedCurrencies[b.currency] }
  );

  // Whenever allBets changes, schedule resolution of unknown token currencies
  $: scheduleResolution(allBets);

  function scheduleResolution(bets: BetDefinition[]) {
    const betApi = betApiServiceFactory({ fetchFn: fetch });
    for (const bet of bets) {
      if (!bet.currencyInfo && bet.currency !== config.resources.xrd && !resolvingAddresses.has(bet.currency)) {
        resolvingAddresses.add(bet.currency);
        betApi
          .getTokenInfo(bet.currency)
          .then((info) => {
            resolvedCurrencies = { ...resolvedCurrencies, [bet.currency]: info };
          })
          .catch(() => {});
      }
    }
  }

  function selectStatus(newStatus: BetStatus) {
    const newSort = defaultSortFor(newStatus);
    goto(`?status=${newStatus}&sort=${newSort}`, { keepFocus: true });
  }

  function selectSort(newSort: string) {
    goto(`?status=${status}&sort=${newSort}`, { keepFocus: true });
  }

  function clearSearch() {
    goto(`?status=${status}&sort=${sort}`, { keepFocus: true });
  }

  async function loadMore() {
    loadingMore = true;
    loadMoreError = '';
    try {
      const betApi = betApiServiceFactory({ fetchFn: fetch });
      const data = await betApi.getBets({
        status,
        sort,
        search: searchQuery || undefined,
        limit: PAGE_SIZE,
        offset: allBets.length
      });
      additionalBets = [...additionalBets, ...data.bets.map(transformApiBet)];
    } catch {
      loadMoreError = 'Failed to load more bets';
    } finally {
      loadingMore = false;
    }
  }

</script>

<section class="featured-section">
  <div class="container">
    <div class="section-header">
      {#if searchQuery}
        <h2 class="section-title">Results for "{searchQuery}"</h2>
        <button class="clear-search" on:click={clearSearch}>Clear search</button>
      {/if}
    </div>

    <div class="filter-bar">
      <div class="status-filters">
        {#each statusFilters as filter}
          <button
            class="filter-btn"
            class:active={status === filter.key}
            on:click={() => selectStatus(filter.key)}
          >
            {filter.label}
          </button>
        {/each}
      </div>

      <div class="sort-dropdown">
        <select
          class="sort-select"
          value={sort}
          on:change={(e) => selectSort(e.currentTarget.value)}
        >
          {#each sortOptions as opt}
            <option value={opt.key}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="markets-grid">
        {#each displayBets as bet}
          <Bet {bet} />
        {/each}
      </div>

      {#if displayBets.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🎲</div>
          <h3 class="empty-title">No bets found</h3>
          <p class="empty-description">Be the first to create a bet!</p>
          <a href="/bet/create" class="create-btn">Create Bet</a>
        </div>
      {/if}

      {#if loadMoreError}
        <div class="error-state">
          <p>{loadMoreError}</p>
          <button on:click={loadMore}>Retry</button>
        </div>
      {/if}

      {#if hasMore && !searchQuery}
        <div class="load-more">
          <button class="load-more-btn" on:click={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More Markets'}
          </button>
        </div>
      {/if}
  </div>
</section>

<style lang="scss">


  .container {
    padding: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
  }

  .section-title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .clear-search {
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }
  }

  .filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    flex-wrap: wrap;
  }

  .status-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    font-weight: 500;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    &.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }
  }

  .sort-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .markets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: var(--spacing-lg);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--color-danger);

    button {
      margin-top: var(--spacing-md);
      padding: 8px 16px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--color-text-secondary);

    .empty-icon {
      font-size: 64px;
      margin-bottom: var(--spacing-md);
    }

    .empty-title {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    .empty-description {
      font-size: var(--font-size-md);
      margin: var(--spacing-lg) auto;
    }

    .create-btn {
      display: inline-block;
      padding: 12px 24px;
      background: var(--color-primary);
      color: white;
      text-decoration: none;
      border-radius: var(--radius-md);
      font-weight: 500;

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }

  .load-more {
    text-align: center;
    padding: var(--spacing-xl) 0;
  }

  .load-more-btn {
    padding: 12px 32px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-md);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--color-bg-hover);
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  @media (max-width: 768px) {


    .container {
      padding: 0;
    }

    .markets-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .filter-bar {
      flex-direction: column;
      align-items: flex-start;
    }

    .status-filters {
      width: 100%;
      overflow-x: auto;
      flex-wrap: nowrap;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
    }

    .filter-btn {
      flex-shrink: 0;
      padding: 6px 12px;
      font-size: var(--font-size-xs);
    }
  }
</style>
