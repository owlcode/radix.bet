<script lang="ts">
  import { i18n } from '$lib/i18n';
  import { config } from '$lib/config';
  import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

  const isMainnet = config.networkId === RadixNetwork.Mainnet;
  const networkLabel = isMainnet ? 'Mainnet' : 'Stokenet';
</script>

<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="footer-logo">
          <span class="logo-icon">🎲</span>
          <span class="logo-text">radix.bet</span>
        </span>
        <p class="footer-tagline">{$i18n.t('footer:tagline')}</p>
      </div>

      <div class="footer-section">
        <h4>{$i18n.t('footer:markets')}</h4>
        <a href="/">{$i18n.t('footer:all_markets')}</a>
        <a href="/?category=football">Football</a>
        <a href="/?category=basketball">Basketball</a>
        <a href="/bet/create">{$i18n.t('nav:create_bet')}</a>
      </div>

      <div class="footer-section">
        <h4>{$i18n.t('footer:community')}</h4>
        <a href="/leaderboard">{$i18n.t('nav:leaderboard')}</a>
        <a href="/how-it-works">{$i18n.t('footer:how_it_works')}</a>
        <a href="https://x.com/radixbet" target="_blank" rel="noopener">Twitter/X</a>
        <a href="https://t.me/+U5hXsdxwEb0yMTc0" target="_blank" rel="noopener">Telegram</a>
      </div>

      <div class="footer-section">
        <h4>Legal</h4>
        <a href="/privacy">Privacy Policy</a>
      </div>
    </div>

    <div class="footer-bottom">
      <p class="footer-copyright">
        &copy; {new Date().getFullYear()} radix.bet
      </p>
      <div class="footer-badges">
        <a
          href="https://stokenet.radix.bet"
          class="badge"
          class:badge-mainnet={isMainnet}
          class:badge-stokenet={!isMainnet}>Stokenet</a
        >
        <!-- <a
          class="badge"
          class:badge-mainnet={!isMainnet}
          class:badge-stokenet={isMainnet}
          href="https://radix.bet">Mainnet</a
        > -->
      </div>
    </div>
  </div>
</footer>

<style lang="scss">
  .site-footer {
    background: #111827;
    padding: var(--spacing-xl) 0 var(--spacing-lg);
    margin-top: 0;
  }

  a.badge {
    text-decoration: none;
  }

  .footer-container {
    padding: 0 var(--spacing-lg);
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
  }

  .footer-brand {
    .footer-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: var(--spacing-xs);
    }

    .logo-icon {
      font-size: 20px;
    }

    .logo-text {
      font-size: 1.125rem;
      font-weight: 800;
      color: #f9fafb;
    }

    .footer-tagline {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      margin: 0;
      max-width: 250px;
      line-height: 1.4;
    }
  }

  .footer-section {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h4 {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: #f9fafb;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    a {
      font-size: var(--font-size-sm);
      color: #9ca3af;
      text-decoration: none;
      transition: color 0.15s ease;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--spacing-md);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .footer-copyright {
    font-size: var(--font-size-xs);
    color: #6b7280;
    margin: 0;
  }

  .footer-badges {
    display: flex;
    gap: var(--spacing-sm);
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #9ca3af;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
  }

  .badge-stokenet {
    color: #f59e0b;
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
  }

  .badge-mainnet {
    color: #10b981;
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.15);
  }

  @media (max-width: 768px) {
    .site-footer {
      padding: var(--spacing-lg) 0 var(--spacing-md);
    }

    .footer-container {
      padding: 0 var(--spacing-md);
    }

    .footer-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
    }

    .footer-brand {
      grid-column: 1 / -1;
    }

    .footer-bottom {
      flex-direction: column;
      gap: var(--spacing-sm);
      text-align: center;
    }
  }
</style>
