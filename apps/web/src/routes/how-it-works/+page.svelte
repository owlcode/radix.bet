<script lang="ts">
  let openFaq: number | null = null;

  function toggleFaq(index: number) {
    openFaq = openFaq === index ? null : index;
  }

  const faqs = [
    {
      q: 'Is my money safe?',
      a: 'Your funds are held by the smart contract on the Radix ledger, not by any person or company. The contract code is open source and verifiable by anyone. There is no intermediary — payouts are handled entirely on-chain.'
    },
    {
      q: "What happens if the creator doesn't resolve?",
      a: 'Your money gets stuck forever. There is no way to withdraw funds from the smart contract other than by marking a winner and burning the owner badge. Radix.bet has no ability to intervene.'
    },
    {
      q: 'Can I bet with tokens other than XRD?',
      a: 'Yes — bets can use any token. The token is chosen by the market creator when setting up the bet. Check the market details to see which token is required.'
    },
    {
      q: 'How are sports bets resolved automatically?',
      a: 'Our event-processor service monitors official results via the ESPN API. After a game ends, it checks every 5 minutes and submits the resolution transaction on-chain. No human intervention is needed.'
    },
    {
      q: 'What are option tokens?',
      a: 'When you place a bet, you receive fungible tokens representing your position. These are native Radix resources that live in your wallet. If your option wins, you exchange them for your proportional share of the prize pool.'
    }
  ];
</script>

<svelte:head>
  <title>How It Works - radix.bet</title>
</svelte:head>

<main class="how-page">
  <div class="container">
    <h1>How radix.bet Works</h1>
    <p class="subtitle">Decentralized prediction markets, explained.</p>

    <section class="section">
      <h2>How Betting Works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Connect Your Wallet</h3>
            <p>
              Install the <a href="https://wallet.radixdlt.com/" target="_blank" rel="noopener"
                >Radix Wallet</a
              >
              and connect it to radix.bet.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Browse or Create Bets</h3>
            <p>
              Explore bets others created across sports, politics, crypto, and more. Anyone is free
              to create a market on any topic — no approval or moderation required.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>Place Your Bet</h3>
            <p>
              Choose the outcome you believe in and put your tokens behind it. You'll receive option
              tokens representing your position — these are real tokens in your wallet.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>Resolution</h3>
            <p>
              Manual markets are resolved by the creator using a one-time owner badge.
              <strong>Only the person who created the bet can mark the winner</strong> — radix.bet itself
              has no control over individual bets.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3>Claim Your Winnings</h3>
            <p>
              If you backed the winning outcome, exchange your option tokens for your proportional
              share of the entire prize pool. Payouts happen directly from the smart contract.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>The Smart Contract</h2>
      <div class="info-grid">
        <div class="info-card">
          <h3>Scrypto-Powered</h3>
          <p>
            Each bet deploys a dedicated component on the Radix ledger. Votes for each bet are
            resources created dynamically together with component and dApp account for that
            component. The contract holds the prize pool — no person or company controls the funds.
          </p>
        </div>
        <div class="info-card">
          <h3>Native Option Tokens</h3>
          <p>
            When you bet, you receive fungible tokens that are native Radix resources. They live in
            your wallet, not in a database. This means your position is a real, transferable asset.
          </p>
        </div>
        <div class="info-card">
          <h3>One-Time Resolution</h3>
          <p>
            An owner badge is minted at market creation and used exactly once to mark the winning
            outcome. After resolution, the badge is burned — preventing anyone from changing the
            result.
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>How Bets Are Resolved</h2>
      <div class="resolution-methods">
        <div class="method-card">
          <div class="method-icon">&#9889;</div>
          <h3>Automated (Sports) <span class="coming-soon">Coming Soon</span></h3>
          <p>
            <s
              >Sports markets are resolved automatically. Our event-processor service monitors
              official results via the ESPN API, checking every 5 minutes after game time. When a
              result is confirmed, the resolution transaction is submitted on-chain with no human
              intervention.</s
            >
          </p>
        </div>
        <div class="method-card">
          <div class="method-icon">&#128273;</div>
          <h3>Manual (Creator)</h3>
          <p>
            For custom markets, the creator holds an owner badge. After the deadline passes, they
            mark the winning outcome on-chain. The badge is burned after use — ensuring one-time,
            irreversible finality. <strong
              >Only the person who created the bet can resolve it.</strong
            >
            Radix.bet has no control over individual bets.
          </p>
        </div>
        <div class="method-card">
          <div class="method-icon">&#9989;</div>
          <h3>Verified (Multi-Sig)</h3>
          <p>
            Some markets require multiple verifiers. Verifier badge holders submit independent votes
            on the outcome. The winner is determined by consensus — adding an extra layer of trust
            for high-stakes markets.
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Leaderboard &amp; Rankings</h2>
      <div class="info-grid">
        <div class="info-card">
          <h3>What's Tracked</h3>
          <p>
            Total wagered, bets won, bets lost, and net profit/loss. Rankings are based on a
            combination of betting volume and win rate.
          </p>
        </div>
        <div class="info-card">
          <h3>Identity-Based</h3>
          <p>
            Your ranking is tied to your Radix identity (persona). All linked accounts contribute to
            a single profile — so your stats stay unified regardless of which account you bet from.
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        {#each faqs as faq, i}
          <button class="faq-item" class:open={openFaq === i} on:click={() => toggleFaq(i)}>
            <div class="faq-question">
              <span>{faq.q}</span>
              <span class="faq-chevron">{openFaq === i ? '−' : '+'}</span>
            </div>
            {#if openFaq === i}
              <p class="faq-answer">{faq.a}</p>
            {/if}
          </button>
        {/each}
      </div>
    </section>

    <div class="cta-section">
      <h2>Ready to start?</h2>
      <div class="cta-buttons">
        <a href="/" class="btn primary">Browse Markets</a>
        <a href="/bet/create" class="btn secondary">Create Market</a>
      </div>
    </div>
  </div>
</main>

<style lang="scss">
  .how-page {
    min-height: calc(100vh - 64px);
    background: var(--color-bg-secondary);
    padding: var(--spacing-2xl) 0;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-sm) 0;
    text-align: center;
  }

  .subtitle {
    text-align: center;
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-2xl) 0;
  }

  .section {
    margin-bottom: var(--spacing-2xl);

    h2 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-lg) 0;
    }
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .step {
    display: flex;
    gap: var(--spacing-lg);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    font-size: var(--font-size-lg);
    font-weight: 700;
    flex-shrink: 0;
  }

  .step-content {
    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    a {
      color: var(--color-primary);
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .info-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);

    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin: 0;
    }
  }

  .resolution-methods {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .method-card {
    display: flex;
    gap: var(--spacing-lg);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);

    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  .coming-soon {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-full);
    padding: 2px 8px;
    vertical-align: middle;
    margin-left: var(--spacing-xs);
  }

  .method-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 22px;
    flex-shrink: 0;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .faq-item {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md) var(--spacing-lg);
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
    }

    &.open {
      background: var(--color-bg-primary);
    }
  }

  .faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .faq-chevron {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }

  .faq-answer {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: var(--spacing-sm) 0 0;
    padding-right: var(--spacing-xl);
  }

  .cta-section {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);

    h2 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-lg) 0;
    }
  }

  .cta-buttons {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md);
  }

  .btn {
    display: inline-flex;
    padding: 12px 28px;
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s ease;

    &.primary {
      background: var(--color-primary);
      color: white;

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    &.secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border);

      &:hover {
        background: var(--color-bg-hover);
      }
    }
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 1.75rem;
    }

    .step {
      flex-direction: column;
      align-items: flex-start;
    }

    .method-card {
      flex-direction: column;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .cta-buttons {
      flex-direction: column;
      align-items: center;
    }
  }
</style>
