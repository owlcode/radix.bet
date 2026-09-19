<script lang="ts">
  import type { PageData } from './$types';
  import { getTransactionUrl } from '@radix-bet/config';

  export let data: PageData;

  const { activity } = data;

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

  function getEventLabel(type: string): string {
    switch (type) {
      case 'BetCreatedEvent':
        return 'Market Created';
      case 'BetVoteEvent':
        return 'Vote Placed';
      case 'BetMarkWinnerEvent':
        return 'Winner Declared';
      case 'BetPrizeClaimedEvent':
        return 'Prize Claimed';
      case 'BetWinnerVoteEvent':
        return 'Verifier Vote';
      default:
        return type
          .replace(/Event$/, '')
          .replace(/([A-Z])/g, ' $1')
          .trim();
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  function truncate(str: string, maxLen = 20): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, 8) + '…' + str.slice(-8);
  }

  const color = getEventColor(activity.type);
</script>

<div class="preview-page">
  <div class="preview-hero">
    <div class="event-icon-wrap" style="background: {color}">
      {getEventIcon(activity.type)}
    </div>
    <div class="event-type-badge" style="color: {color}; border-color: {color}">
      {getEventLabel(activity.type)}
    </div>
    <h1 class="event-summary">{activity.details}</h1>
    <p class="market-name-link">
      on <a href="/bet/{activity.componentAddress}" class="market-link">{activity.betName}</a>
    </p>
  </div>
</div>

<div class="preview-content">
  <!-- Event details card -->
  <div class="detail-card">
    <h2 class="card-title">Transaction Details</h2>

    <dl class="detail-list">
      <div class="detail-row">
        <dt>Event</dt>
        <dd>
          <span class="badge" style="background: {color}20; color: {color}">
            {getEventLabel(activity.type)}
          </span>
        </dd>
      </div>

      <div class="detail-row">
        <dt>Market</dt>
        <dd>
          <a href="/bet/{activity.componentAddress}" class="inline-link">
            {activity.betName}
          </a>
        </dd>
      </div>

      {#if activity.parsedDetails.optionName}
        <div class="detail-row">
          <dt>Option</dt>
          <dd class="value-highlight">{activity.parsedDetails.optionName}</dd>
        </div>
      {/if}

      {#if activity.parsedDetails.amount}
        <div class="detail-row">
          <dt>Amount</dt>
          <dd class="value-amount">
            {activity.parsedDetails.amount} <span class="currency">{activity.currencySymbol}</span>
          </dd>
        </div>
      {/if}

      {#if activity.parsedDetails.voter}
        <div class="detail-row">
          <dt>Account</dt>
          <dd class="mono">{truncate(activity.parsedDetails.voter, 32)}</dd>
        </div>
      {/if}

      <div class="detail-row">
        <dt>Time</dt>
        <dd>{formatDate(activity.timestamp)}</dd>
      </div>

      {#if activity.transactionId}
        <div class="detail-row">
          <dt>Transaction</dt>
          <dd>
            <a
              href="{getTransactionUrl(activity.transactionId)}"
              target="_blank"
              rel="noopener noreferrer"
              class="tx-link"
            >
              <span class="mono">{truncate(activity.transactionId, 32)}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="external-icon"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </dd>
        </div>
      {/if}

      {#if activity.stateVersion}
        <div class="detail-row">
          <dt>State Version</dt>
          <dd class="mono">{activity.stateVersion.toLocaleString()}</dd>
        </div>
      {/if}
    </dl>
  </div>

  <!-- Market info card (if description available) -->
  {#if activity.betDescription}
    <div class="detail-card">
      <h2 class="card-title">About This Market</h2>
      <p class="market-description">{activity.betDescription}</p>
    </div>
  {/if}

  <!-- CTA -->
  <div class="cta-row">
    <a href="/bet/{activity.componentAddress}" class="btn btn-primary">
      View Market
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </a>
    <a href="/" class="btn btn-secondary"> All Markets </a>
  </div>
</div>

<style lang="scss">
  .preview-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl) var(--spacing-md) var(--spacing-lg);
    background: var(--color-bg-secondary);
  }

  .preview-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    text-align: center;
    max-width: 540px;
    width: 100%;
  }

  .event-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    color: white;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
  }

  .event-type-badge {
    display: inline-block;
    padding: 3px 12px;
    border: 1px solid;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.8);
  }

  .event-summary {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: var(--spacing-xs) 0 0;
    line-height: 1.3;
  }

  .market-name-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .market-link {
    color: var(--color-primary);
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .preview-content {
    max-width: 540px;
    width: 100%;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md) var(--spacing-2xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .detail-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .card-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-md);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border-light, #f3f4f6);

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    dt {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      font-weight: 500;
      flex-shrink: 0;
      padding-top: 1px;
    }

    dd {
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      font-weight: 500;
      margin: 0;
      text-align: right;
      word-break: break-all;
    }
  }

  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .inline-link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  .value-highlight {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .value-amount {
    font-weight: 700;
    font-size: var(--font-size-md) !important;
    color: var(--color-text-primary);
  }

  .currency {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .mono {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .tx-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }

    .mono {
      color: inherit;
    }
  }

  .external-icon {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .market-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .cta-row {
    display: flex;
    gap: var(--spacing-sm);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &.btn-primary {
      background: var(--color-primary);
      color: white;
      flex: 1;
      justify-content: center;

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    &.btn-secondary {
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);

      &:hover {
        background: var(--color-bg-hover);
        color: var(--color-text-primary);
      }
    }
  }

  @media (max-width: 640px) {
    .preview-content {
      padding: var(--spacing-lg) var(--spacing-md);
    }

    .detail-row {
      flex-direction: column;
      gap: 2px;

      dd {
        text-align: left;
      }
    }
  }
</style>
