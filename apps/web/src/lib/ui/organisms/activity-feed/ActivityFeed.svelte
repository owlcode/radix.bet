<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let betAddress: string | undefined = undefined;
  export let limit = 10;

  const POLL_INTERVAL_MS = 5000;

  interface ActivityItem {
    id: string;
    type: string;
    betName: string;
    componentAddress: string;
    transactionId: string | null;
    timestamp: string;
    details: string;
  }

  let activity: ActivityItem[] = [];
  let loading = true;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  async function fetchActivity() {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (betAddress) params.set('bet', betAddress);
      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newActivity: ActivityItem[] = data.activity || [];
        if (
          newActivity.length > 0 &&
          (activity.length === 0 || newActivity[0].id !== activity[0].id)
        ) {
          activity = newActivity;
        } else if (newActivity.length === 0 && activity.length > 0) {
          activity = [];
        }
      }
    } catch (e) {
      console.error('Failed to load activity:', e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchActivity();
    pollTimer = setInterval(fetchActivity, POLL_INTERVAL_MS);
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
  });

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function getEventIcon(type: string): string {
    switch (type) {
      case 'BetCreatedEvent':
        return '+';
      case 'BetVoteEvent':
        return '$';
      case 'BetMarkWinnerEvent':
        return '!';
      case 'BetPrizeClaimedEvent':
        return '*';
      case 'BetWinnerVoteEvent':
        return '?';
      default:
        return '>';
    }
  }

  function getEventColor(type: string): string {
    switch (type) {
      case 'BetCreatedEvent':
        return 'var(--color-primary)';
      case 'BetVoteEvent':
        return 'var(--color-success)';
      case 'BetMarkWinnerEvent':
        return '#f59e0b';
      case 'BetPrizeClaimedEvent':
        return '#8b5cf6';
      case 'BetWinnerVoteEvent':
        return '#3b82f6';
      default:
        return 'var(--color-text-muted)';
    }
  }
</script>

<div class="activity-feed">
  <h3 class="feed-title">Recent Activity</h3>

  {#if loading}
    <div class="feed-loading">
      <div class="spinner"></div>
    </div>
  {:else if activity.length === 0}
    <p class="feed-empty">No activity yet</p>
  {:else}
    <div class="feed-list">
      {#each activity as item}
        <a href="/activity/{item.id}" class="feed-item">
          <span class="feed-icon" style="background: {getEventColor(item.type)}">
            {getEventIcon(item.type)}
          </span>
          <div class="feed-content">
            <span class="feed-details">{item.details}</span>
            <span class="feed-meta">
              <span class="feed-bet-name">{item.betName}</span>
              <span class="feed-time">{timeAgo(item.timestamp)}</span>
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .activity-feed {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .feed-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .feed-list {
    max-height: 600px;
    overflow-y: auto;
  }

  .feed-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border-light, #f3f4f6);
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #f9fafb);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .feed-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: white;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .feed-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .feed-details {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .feed-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .feed-bet-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }

  .feed-time {
    flex-shrink: 0;
  }

  .feed-loading,
  .feed-empty {
    padding: var(--spacing-lg);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
