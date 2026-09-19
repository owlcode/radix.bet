<svelte:head>
  <title>Privacy Policy &amp; Cookie Policy - radix.bet</title>
</svelte:head>

<main class="privacy-page">
  <div class="container">
    <h1>Privacy Policy &amp; Cookie Policy</h1>
    <p class="subtitle">Last updated: March 2025</p>

    <section class="section">
      <h2>1. Introduction</h2>
      <p>
        Welcome to <strong>radix.bet</strong>. This policy explains how we collect, use, and
        protect information when you use our prediction market platform. By using radix.bet, you
        agree to the practices described here.
      </p>
    </section>

    <section class="section">
      <h2>2. Information We Collect</h2>

      <h3>Blockchain Data</h3>
      <p>
        radix.bet is built on the Radix public ledger. When you connect your wallet or interact
        with the platform, your wallet address and all on-chain transactions are publicly visible
        by nature of the blockchain. We do not control or store this data — it is inherently
        public.
      </p>

      <h3>Usage Analytics</h3>
      <p>
        <strong>
          We use tracking technology to analyse how users interact with radix.bet in order to
          improve the product.
        </strong>
        This includes data such as pages visited, features used, session duration, device type,
        browser, and general geographic location (country-level). This data does not identify you
        personally — it is aggregated and used solely to understand how the platform is used and
        to guide product development.
      </p>

      <h3>Automatically Collected Technical Data</h3>
      <p>
        When you visit radix.bet, our servers may automatically collect your IP address, browser
        type, operating system, referring URLs, and timestamps. This information is used for
        security, performance monitoring, and diagnosing technical issues.
      </p>
    </section>

    <section class="section">
      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To operate and provide the radix.bet prediction market platform</li>
        <li>
          <strong>To analyse usage patterns and improve the product</strong> through analytics
        </li>
        <li>To monitor platform performance and diagnose technical issues</li>
        <li>To detect and prevent fraud or abuse</li>
        <li>To comply with applicable laws and regulations</li>
      </ul>
    </section>

    <section class="section">
      <h2>4. Data Sharing</h2>
      <p>
        We do <strong>not</strong> sell your personal data to third parties. We may share data
        with:
      </p>
      <ul>
        <li>
          <strong>Analytics providers</strong> — to help us understand platform usage (data is
          anonymised or pseudonymised)
        </li>
        <li>
          <strong>Infrastructure providers</strong> — hosting and CDN services required to operate
          the platform
        </li>
        <li>
          <strong>Legal authorities</strong> — if required by applicable law or court order
        </li>
      </ul>
    </section>

    <section class="section">
      <h2>5. Cookie Policy</h2>
      <p>
        radix.bet uses cookies and similar tracking technologies. Cookies are small text files
        stored in your browser.
      </p>

      <h3>Types of Cookies We Use</h3>
      <div class="cookie-table">
        <div class="cookie-row header">
          <span>Type</span>
          <span>Purpose</span>
        </div>
        <div class="cookie-row">
          <span><strong>Essential</strong></span>
          <span>Required for the platform to function (e.g. session state, wallet connection)</span>
        </div>
        <div class="cookie-row">
          <span><strong>Analytics</strong></span>
          <span
            >Used to track usage patterns and understand how visitors use radix.bet, so we can
            improve the product</span
          >
        </div>
        <div class="cookie-row">
          <span><strong>Preferences</strong></span>
          <span>Remembers your settings such as language or theme preferences</span>
        </div>
      </div>

      <p>
        When you first visit radix.bet, a cookie consent banner will appear asking for your
        permission before any analytics cookies are set. You can accept, decline, or manage your
        preferences at any time. Essential cookies are always active as they are required for the
        platform to function.
      </p>
    </section>

    <section class="section">
      <h2>6. Data Retention</h2>
      <p>
        Analytics and usage data is retained for up to 24 months. Blockchain data is permanent by
        nature and not under our control.
      </p>
    </section>

    <section class="section">
      <h2>7. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, rectify, or request
        deletion of personal data we hold about you. To make a request, contact us at the address
        below.
      </p>
      <p>
        Note: on-chain data (wallet addresses, transactions) is public and immutable — we cannot
        delete data recorded on the Radix blockchain.
      </p>
    </section>

    <section class="section">
      <h2>8. Security</h2>
      <p>
        We take reasonable technical and organisational measures to protect data against
        unauthorised access. However, no system is completely secure, and we encourage users to
        practise good security hygiene with their wallets and devices.
      </p>
    </section>

    <section class="section">
      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. The "Last updated" date at the top of this
        page will reflect the most recent revision. Continued use of radix.bet after changes
        constitutes acceptance of the updated policy.
      </p>
    </section>

    <section class="section">
      <h2>10. Contact</h2>
      <p>
        If you have questions about this policy or your data, you can reach us via
        <a href="https://x.com/radixbet" target="_blank" rel="noopener">Twitter/X @radixbet</a>.
      </p>
    </section>
  </div>
</main>

<style lang="scss">
  .privacy-page {
    min-height: calc(100vh - 64px);
    background: var(--color-bg-secondary);
    padding: var(--spacing-2xl) 0;
  }

  .container {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-xs) 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--spacing-2xl) 0;
  }

  .section {
    margin-bottom: var(--spacing-xl);

    h2 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-md) 0;
      padding-bottom: var(--spacing-xs);
      border-bottom: 1px solid var(--color-border);
    }

    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: var(--spacing-md) 0 var(--spacing-xs) 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.7;
      margin: 0 0 var(--spacing-sm) 0;
    }

    ul {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.7;
      padding-left: var(--spacing-lg);
      margin: 0 0 var(--spacing-sm) 0;

      li {
        margin-bottom: var(--spacing-xs);
      }
    }

    a {
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .cookie-table {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin: var(--spacing-md) 0;

    .cookie-row {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;

      &:last-child {
        border-bottom: none;
      }

      &.header {
        background: var(--color-bg-hover);
        font-weight: 600;
        color: var(--color-text-primary);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }

    .cookie-table .cookie-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }
  }
</style>
