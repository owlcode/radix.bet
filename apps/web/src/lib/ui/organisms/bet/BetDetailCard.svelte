<script lang="ts">
  import Countdown from '$lib/ui/molecules/countdown/Countdown.svelte';
  import { createEventDispatcher } from 'svelte';

  export let name: string;
  export let enabled: boolean = true;
  export let totalVotes: number;
  export let endsAt: string | undefined;
  export let enrichedStatus: 'active' | 'ended' | 'resolved' | undefined = undefined;
  export let winningOptionName: string | null | undefined = undefined;
  export let options: { name: string; image: string; amount?: number; color?: string }[];
  export let currencyInfo: { symbol: string; name: string; iconUrl: string } | undefined = undefined;

  const dispatch = createEventDispatcher<{
    vote: string;
  }>();

  $: optionsWithPercent = options.map((option) => {
    const percent =
      totalVotes > 0
        ? Math.round(((option.amount || 0) / totalVotes) * 100)
        : Math.round(100 / options.length);
    return { ...option, percent };
  });

  $: formattedVolume =
    totalVotes >= 1000000
      ? `${(totalVotes / 1000000).toFixed(1)}M`
      : totalVotes >= 1000
        ? `${(totalVotes / 1000).toFixed(1)}K`
        : totalVotes.toLocaleString();

  $: isBinaryBet = options.length === 2;
  $: isResolved = enrichedStatus === 'resolved';
  $: isEnded = enrichedStatus === 'ended';
</script>

<article class="detail-card" class:disabled={!enabled} class:resolved={isResolved}>
  <div class="card-header">
    <div class="card-meta">
      {#if enabled && endsAt}
        <span class="live-indicator">Live</span>
      {:else if isResolved}
        <span class="resolved-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          Resolved
        </span>
      {:else if isEnded}
        <span class="ended-badge">Ended</span>
      {/if}
      <span class="volume-badge">
        <img
          src={currencyInfo?.iconUrl ?? '/icon-xrd.png'}
          alt={currencyInfo?.symbol ?? 'XRD'}
          class="currency-icon"
          on:error={(e) => { e.currentTarget.src = '/icon-xrd.png'; }}
        />
        {formattedVolume} Vol.
      </span>
    </div>

    {#if enabled && endsAt}
      <div class="deadline">
        <Countdown date={endsAt} />
      </div>
    {/if}
  </div>

  <h2 class="card-title">{name}</h2>

  {#if isResolved && winningOptionName}
    <div class="winner-banner">
      <svg class="trophy-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C13.1 2 14 2.9 14 4V6H16C16.55 6 17 6.45 17 7H19C20.1 7 21 7.9 21 9V11C21 12.66 19.66 14 18 14H17.42C16.9 15.77 15.47 17.12 13.68 17.67L14 19H16C16.55 19 17 19.45 17 20V21C17 21.55 16.55 22 16 22H8C7.45 22 7 21.55 7 21V20C7 19.45 7.45 19 8 19H10L10.32 17.67C8.53 17.12 7.1 15.77 6.58 14H6C4.34 14 3 12.66 3 11V9C3 7.9 3.9 7 5 7H7C7 6.45 7.45 6 8 6H10V4C10 2.9 10.9 2 12 2ZM5 9V11C5 11.55 5.45 12 6 12H6.22C6.08 11.39 6 10.74 6 10V9H5ZM18 9H18V10C18 10.74 17.92 11.39 17.78 12H18C18.55 12 19 11.55 19 11V9Z"/>
      </svg>
      <span class="winner-text">{winningOptionName}</span>
    </div>
  {/if}

  <div class="options-list">
    {#each optionsWithPercent as option, index}
      <div
        class="option-row"
        class:winner={isResolved && winningOptionName === option.name}
        class:loser={isResolved && winningOptionName != null && winningOptionName !== option.name}
      >
        <div class="option-info">
          {#if option.image}
            <img src={option.image} alt={option.name} class="option-icon" />
          {/if}
          <span class="option-name">
            {option.name}
            {#if isResolved && winningOptionName === option.name}
              <svg class="inline-trophy" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4V6H16C16.55 6 17 6.45 17 7H19C20.1 7 21 7.9 21 9V11C21 12.66 19.66 14 18 14H17.42C16.9 15.77 15.47 17.12 13.68 17.67L14 19H16C16.55 19 17 19.45 17 20V21C17 21.55 16.55 22 16 22H8C7.45 22 7 21.55 7 21V20C7 19.45 7.45 19 8 19H10L10.32 17.67C8.53 17.12 7.1 15.77 6.58 14H6C4.34 14 3 12.66 3 11V9C3 7.9 3.9 7 5 7H7C7 6.45 7.45 6 8 6H10V4C10 2.9 10.9 2 12 2ZM5 9V11C5 11.55 5.45 12 6 12H6.22C6.08 11.39 6 10.74 6 10V9H5ZM18 9H18V10C18 10.74 17.92 11.39 17.78 12H18C18.55 12 19 11.55 19 11V9Z"/>
              </svg>
            {/if}
          </span>
        </div>

        <div class="option-actions">
          <span
            class="option-probability"
            class:text-success={index === 0}
            class:text-danger={index === 1}
          >
            {option.percent}%
          </span>

          {#if enabled}
            <button
              class="bet-btn"
              class:bet-btn-yes={index === 0 || option.name.toLowerCase() === 'yes'}
              class:bet-btn-no={index === 1 || option.name.toLowerCase() === 'no'}
              class:bet-btn-primary={index > 1}
              on:click|stopPropagation={() => dispatch('vote', option.name)}
            >
              {option.name.length > 12 ? 'Bet' : option.name}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if isBinaryBet && optionsWithPercent.length === 2}
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill progress-yes" style="width: {optionsWithPercent[0].percent}%" />
      </div>
    </div>
  {/if}
</article>

<style lang="scss">
  .detail-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl) var(--spacing-lg);

    &.disabled {
      opacity: 0.75;

      .card-title {
        color: var(--color-text-secondary);
      }
    }

    &.resolved {
      border-color: rgba(245, 158, 11, 0.3);
    }
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-sm);
    color: var(--color-danger);
    font-weight: 600;

    &::before {
      content: '';
      width: 8px;
      height: 8px;
      background: var(--color-danger);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .resolved-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    font-size: var(--font-size-xs);
    font-weight: 600;
    border-radius: var(--radius-sm);
  }

  .ended-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    background: var(--color-bg-secondary);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
    border-radius: var(--radius-sm);
  }

  .volume-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-weight: 500;

    .currency-icon {
      width: 16px;
      height: 16px;
    }
  }

  .deadline {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .card-title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-lg) 0;
    line-height: 1.3;
  }

  .winner-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    .trophy-icon {
      color: #f59e0b;
      flex-shrink: 0;
    }

    .winner-text {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: #d97706;
    }
  }

  .options-list {
    display: flex;
    flex-direction: column;
  }

  .option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid var(--color-border-light);
    gap: var(--spacing-md);

    &:last-child {
      border-bottom: none;
    }

    &.winner {
      .option-name {
        font-weight: 700;
        color: #d97706;
      }

      .option-probability {
        color: #d97706 !important;
      }
    }

    &.loser {
      opacity: 0.5;
    }
  }

  .option-info {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .option-icon {
    width: 52px;
    height: 52px;
    min-width: 52px;
    border-radius: var(--radius-lg);
    object-fit: cover;
    border: 1px solid var(--color-border);
  }

  .option-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: var(--font-size-lg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .inline-trophy {
    color: #f59e0b;
    flex-shrink: 0;
  }

  .option-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .option-probability {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    min-width: 50px;
    text-align: right;
  }

  .text-success {
    color: var(--color-success);
  }

  .text-danger {
    color: var(--color-danger);
  }

  .bet-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    min-width: 80px;
    white-space: nowrap;

    &.bet-btn-yes {
      background-color: var(--color-success-bg);
      color: var(--color-success);
      border-color: var(--color-success);

      &:hover {
        background-color: var(--color-success);
        color: white;
      }
    }

    &.bet-btn-no {
      background-color: var(--color-danger-bg);
      color: var(--color-danger);
      border-color: var(--color-danger);

      &:hover {
        background-color: var(--color-danger);
        color: white;
      }
    }

    &.bet-btn-primary {
      background-color: var(--color-primary-light);
      color: var(--color-primary);
      border-color: var(--color-primary);

      &:hover {
        background-color: var(--color-primary);
        color: white;
      }
    }
  }

  .progress-container {
    margin-top: var(--spacing-lg);
  }

  .progress-bar {
    height: 8px;
    background: var(--color-danger-light);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.3s ease;

    &.progress-yes {
      background: var(--color-success);
    }
  }

  @media (max-width: 640px) {
    .detail-card {
      padding: var(--spacing-lg) var(--spacing-md);
    }

    .card-title {
      font-size: var(--font-size-xl);
    }

    .option-icon {
      width: 40px;
      height: 40px;
      min-width: 40px;
    }

    .option-name {
      font-size: var(--font-size-md);
    }

    .option-probability {
      font-size: var(--font-size-xl);
    }

    .bet-btn {
      padding: 8px 18px;
      min-width: 68px;
    }
  }
</style>
