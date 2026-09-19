<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from 'svelte-icons-pack';
  import { AiOutlineTrophy } from 'svelte-icons-pack/ai';

  interface LeaderboardEntry {
    identityAddress: string;
    displayAddress: string;
    displayLabel?: string;
    betsCreated: number;
    activeBets: number;
    resolvedBets: number;
    joinedAt: string;
  }

  let leaderboard: LeaderboardEntry[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      leaderboard = data.leaderboard || [];
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      loading = false;
    }
  });

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 16)}...${addr.slice(-6)}`;
  }

  function getMedalEmoji(rank: number) {
    if (rank === 0) return '1st';
    if (rank === 1) return '2nd';
    if (rank === 2) return '3rd';
    return `${rank + 1}th`;
  }
</script>

<svelte:head>
  <title>Leaderboard - radix.bet</title>
</svelte:head>

<main class="leaderboard-page">
  <div class="container">
    <div class="page-header">
      <div class="header-icon">
        <Icon src={AiOutlineTrophy} size="32" />
      </div>
      <div>
        <h1>Leaderboard</h1>
        <p class="subtitle">Top market creators on radix.bet</p>
      </div>
    </div>

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    {:else if leaderboard.length === 0}
      <div class="empty">
        <p>No users with bets yet. Be the first!</p>
        <a href="/bet/create" class="cta-btn">Create Market</a>
      </div>
    {:else}
      <div class="table-container">
        <div class="table-header">
          <span class="col-rank">Rank</span>
          <span class="col-user">User</span>
          <span class="col-stat">Markets Created</span>
          <span class="col-stat">Active</span>
          <span class="col-stat">Resolved</span>
          <span class="col-stat">Joined</span>
        </div>
        {#each leaderboard as entry, i}
          <div class="table-row" class:top-3={i < 3}>
            <span
              class="col-rank rank-badge"
              class:gold={i === 0}
              class:silver={i === 1}
              class:bronze={i === 2}
            >
              {getMedalEmoji(i)}
            </span>
            <span class="col-user">
              <span class="user-name"
                >{entry.displayLabel || truncateAddress(entry.displayAddress)}</span
              >
            </span>
            <span class="col-stat stat-primary">{entry.betsCreated}</span>
            <span class="col-stat">{entry.activeBets}</span>
            <span class="col-stat">{entry.resolvedBets}</span>
            <span class="col-stat date">{new Date(entry.joinedAt).toLocaleDateString()}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<style lang="scss">
  .leaderboard-page {
    min-height: calc(100vh - 64px);
    background: var(--color-bg-secondary);
    padding: var(--spacing-xl) 0 var(--spacing-2xl);
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);

    h1 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    .subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin: 4px 0 0;
    }
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    border-radius: var(--radius-lg);
  }

  .table-container {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 60px 2fr 1fr 80px 80px 100px;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
  }

  .table-row {
    display: grid;
    grid-template-columns: 60px 2fr 1fr 80px 80px 100px;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    align-items: center;
    border-bottom: 1px solid var(--color-border-light, #f3f4f6);
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #f9fafb);
    }

    &:last-child {
      border-bottom: none;
    }

    &.top-3 {
      background: var(--color-bg-secondary);
    }
  }

  .rank-badge {
    font-weight: 700;
    font-size: var(--font-size-sm);

    &.gold {
      color: #f59e0b;
    }
    &.silver {
      color: #9ca3af;
    }
    &.bronze {
      color: #cd7f32;
    }
  }

  .user-name {
    font-weight: 500;
    color: var(--color-text-primary);
    font-family: monospace;
    font-size: var(--font-size-sm);
  }

  .stat-primary {
    font-weight: 700;
    color: var(--color-primary);
    font-size: var(--font-size-md);
  }

  .col-stat {
    text-align: center;

    &.date {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  }

  .col-rank {
    text-align: center;
  }

  .loading,
  .empty {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto var(--spacing-md);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .cta-btn {
    display: inline-block;
    margin-top: var(--spacing-md);
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

  @media (max-width: 768px) {
    .table-header {
      display: none;
    }

    .table-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
    }
  }
</style>
