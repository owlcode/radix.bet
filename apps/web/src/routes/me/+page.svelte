<script lang="ts">
  import { http } from '$lib/http';
  import { rdt } from '$lib/stores/rdt';
  import { DataRequestBuilder } from '@radixdlt/radix-dapp-toolkit';
  import { Icon } from 'svelte-icons-pack';
  import { ImLink } from 'svelte-icons-pack/im';
  import {
    RiUserFacesAccountCircleLine,
    RiFinanceWallet3Line,
    RiDocumentFileListLine
  } from 'svelte-icons-pack/ri';
  import { AiOutlineTrophy } from 'svelte-icons-pack/ai';
  import { i18n } from '$lib/i18n';
  import { getClaimPackageRoyaltiesManifest } from '$lib/manifests/claim-package-royalties';
  import { config } from '$lib/config';
  import type { PlacedBet } from '$lib/model/bet';

  export let data;

  $: betsCreated = data.betsCreated || [];
  $: stats = data.stats || {
    activeBetsCount: 0,
    totalWagered: 0,
    betsCreated: 0,
    winRate: null,
    createdMarketVolume: 0
  };
  $: placedBets = data.placedBets || [];

  let activeTab = 'all';
  $: filteredPlacedBets =
    activeTab === 'all' ? placedBets : placedBets.filter((b: PlacedBet) => b.status === activeTab);

  const linkAccounts = async () => {
    const accounts = await $rdt.walletApi.sendOneTimeRequest(
      DataRequestBuilder.accounts().atLeast(1).withProof()
    );
    if (accounts.isOk()) {
      http.post('/api/account/link', accounts.value);
    }
  };

  const claimPackageRoyalties = () => {
    $rdt.walletApi.sendTransaction(
      getClaimPackageRoyaltiesManifest(
        config.publicBetV1,
        config.packageOwnerBadge,
        data.packageRoyaltiesAccount!,
        data.packageOwnerBadgeNftId!
      )
    );
  };
</script>

<svelte:head>
  <title>{$i18n.t('account:my_account')} - radix.bet</title>
</svelte:head>

<main class="profile-page">
  <div class="container">
    <div class="profile-header">
      <div class="profile-avatar">
        <Icon src={RiUserFacesAccountCircleLine} size="40" />
      </div>
      <div class="profile-info">
        <h1>{$i18n.t('account:my_account')}</h1>
        <p class="profile-address" title={data.identityAddress}>
          {data.identityAddress.slice(0, 20)}...{data.identityAddress.slice(-6)}
        </p>
      </div>
      {#if data.packageRoyaltiesAccount}
        <button class="link-btn primary" on:click={claimPackageRoyalties}>
          Claim Package Royalties
        </button>
      {/if}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div
          class="stat-icon"
          style="background: var(--color-primary-light); color: var(--color-primary);"
        >
          <Icon src={RiFinanceWallet3Line} size="20" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{stats.activeBetsCount}</span>
          <span class="stat-label">{$i18n.t('account:active_bets')}</span>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="stat-icon"
          style="background: var(--color-success-light); color: var(--color-success);"
        >
          <Icon src={AiOutlineTrophy} size="20" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{stats.totalWagered.toLocaleString()} XRD</span>
          <span class="stat-label">Total Wagered</span>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="stat-icon"
          style="background: var(--color-bg-secondary); color: var(--color-text-secondary);"
        >
          <Icon src={RiDocumentFileListLine} size="20" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{stats.betsCreated}</span>
          <span class="stat-label">{$i18n.t('account:bets_created')}</span>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="stat-icon"
          style="background: var(--color-primary-light); color: var(--color-primary);"
        >
          <Icon src={AiOutlineTrophy} size="20" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{stats.winRate !== null ? `${stats.winRate}%` : '—'}</span>
          <span class="stat-label">Win Rate</span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <section class="card">
        <div class="card-header">
          <h2>{$i18n.t('account:linked_accounts')}</h2>
          <button class="link-btn" on:click={linkAccounts}>
            <Icon src={ImLink} size="14" />
            {$i18n.t('account:link_account')}
          </button>
        </div>

        <div class="card-body">
          {#if data?.user?.accounts?.length}
            <div class="accounts-list">
              {#each data.user.accounts as acc}
                <div class="account-item">
                  <span class="account-address"
                    >{acc.address.slice(0, 20)}...{acc.address.slice(-6)}</span
                  >
                  {#if acc.label}
                    <span class="account-label">{acc.label}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>{$i18n.t('account:no_accounts')}</p>
              <button class="link-btn primary" on:click={linkAccounts}>
                <Icon src={ImLink} size="14" />
                {$i18n.t('account:link_first')}
              </button>
            </div>
          {/if}
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>{$i18n.t('account:my_bets')}</h2>
          <a href="/bet/create" class="view-all">{$i18n.t('account:create_new')}</a>
        </div>

        <div class="card-body">
          {#if betsCreated.length}
            <div class="markets-list">
              {#each betsCreated as market}
                <a href="/bet/{market.componentAddress}" class="market-item">
                  <div class="market-info">
                    <span class="market-name">{market.name}</span>
                    <span class="market-meta">{market.options.length} options</span>
                  </div>
                  <div class="market-stats">
                    <span class="market-volume">{market.totalVolume.toLocaleString()} XRD</span>
                    <span
                      class="status-badge"
                      class:active={market.enrichedStatus === 'active'}
                      class:resolved={market.enrichedStatus === 'resolved'}
                      class:ended={market.enrichedStatus === 'ended'}
                    >
                      {market.enrichedStatus}
                    </span>
                  </div>
                </a>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>{$i18n.t('account:no_bets_created')}</p>
              <a href="/bet/create" class="link-btn primary">{$i18n.t('account:create_first')}</a>
            </div>
          {/if}
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-header">
        <h2>{$i18n.t('account:placed_bets')}</h2>
        <div class="tabs">
          <button
            class="tab"
            class:active={activeTab === 'all'}
            on:click={() => (activeTab = 'all')}
          >
            {$i18n.t('common:all')}
          </button>
          <button
            class="tab"
            class:active={activeTab === 'active'}
            on:click={() => (activeTab = 'active')}
          >
            {$i18n.t('common:active')}
          </button>
          <button
            class="tab"
            class:active={activeTab === 'won'}
            on:click={() => (activeTab = 'won')}
          >
            {$i18n.t('common:won')}
          </button>
          <button
            class="tab"
            class:active={activeTab === 'lost'}
            on:click={() => (activeTab = 'lost')}
          >
            {$i18n.t('common:lost')}
          </button>
        </div>
      </div>

      <div class="card-body">
        {#if filteredPlacedBets.length}
          <div class="bets-table">
            <div class="table-header">
              <span>{$i18n.t('common:market')}</span>
              <span>{$i18n.t('common:position')}</span>
              <span>{$i18n.t('common:amount')}</span>
              <span>{$i18n.t('common:status')}</span>
            </div>
            {#each filteredPlacedBets as bet}
              <a href="/bet/{bet.componentAddress}" class="table-row">
                <span class="cell-market">{bet.betName}</span>
                <span class="cell-option">{bet.optionName}</span>
                <span class="cell-amount">{bet.amount.toLocaleString()} XRD</span>
                <span>
                  <span
                    class="status-badge"
                    class:active={bet.status === 'active'}
                    class:won={bet.status === 'won'}
                    class:lost={bet.status === 'lost'}
                    class:ended={bet.status === 'ended'}
                  >
                    {bet.status}
                  </span>
                </span>
              </a>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p>
              {activeTab === 'all'
                ? $i18n.t('account:no_placed_bets')
                : $i18n.t('account:no_filtered_bets', { tab: activeTab })}
            </p>
            <a href="/" class="link-btn primary">{$i18n.t('account:browse_markets')}</a>
          </div>
        {/if}
      </div>
    </section>
  </div>
</main>

<style lang="scss">
  .profile-page {
    min-height: calc(100vh - 56px);
    background: var(--color-bg-secondary);
    padding: var(--spacing-lg) 0 var(--spacing-2xl);
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .profile-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    min-width: 64px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: 50%;
  }

  .profile-info {
    min-width: 0;

    h1 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 2px 0;
    }

    .profile-address {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: monospace;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;


    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: var(--radius-md);
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
    gap: var(--spacing-sm);

    h2 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
      white-space: nowrap;
    }

    .view-all {
      font-size: var(--font-size-xs);
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .card-body {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .link-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    &.primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }

  .accounts-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .account-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .account-address {
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .account-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .markets-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .market-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.15s ease;
    gap: var(--spacing-sm);

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .market-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .market-name {
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .market-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .market-stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  .market-volume {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    border-radius: var(--radius-full);
    text-transform: capitalize;

    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    &.resolved,
    &.won {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    &.ended {
      background: var(--color-warning-light, #fef3c7);
      color: var(--color-warning, #d97706);
    }

    &.lost {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }
  }

  .tabs {
    display: flex;
    gap: 2px;
  }

  .tab {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
    }

    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }
  }

  .bets-table {
    display: flex;
    flex-direction: column;
  }

  .table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 90px;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border);
  }

  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 90px;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    align-items: center;
    border-bottom: 1px solid var(--color-border-light);
    text-decoration: none;
    transition: background 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .cell-market {
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-option {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .cell-amount {
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--color-text-secondary);

    p {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
    }
  }

  @media (max-width: 768px) {
    .profile-page {
      padding: var(--spacing-md) 0 var(--spacing-xl);
    }

    .container {
      padding: 0 var(--spacing-md);
    }

    .profile-header {
      padding: var(--spacing-md);
    }

    .profile-avatar {
      width: 48px;
      height: 48px;
      min-width: 48px;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-sm);
    }

    .stat-card {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .content-grid {
      grid-template-columns: 1fr;
    }

    .card-header {
      padding: var(--spacing-sm) var(--spacing-md);
      flex-wrap: wrap;
    }

    .card-body {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .tabs {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table-header {
      display: none;
    }

    .table-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-xs);
      border-bottom: none;
    }

    .market-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .market-stats {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
