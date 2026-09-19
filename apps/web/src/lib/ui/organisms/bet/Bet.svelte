<script lang="ts">
  import { Box, Anchor } from '@svelteuidev/core';
  import { writable } from 'svelte/store';
  import { http } from '$lib/http';
  import { account, accounts, rdt } from '$lib/stores/rdt';
  import BetCard from './BetCard.svelte';
  import BetDetailCard from './BetDetailCard.svelte';
  import { type BetDefinition } from '$lib/model/bet';
  import { EntityFactory } from '$lib/gateway';
  import { i18n } from '$lib/i18n';

  export let bet: BetDefinition;
  export let variant: 'compact' | 'detail' = 'compact';

  let amount = 200;
  let toWin = 100;
  let selectedAccount: string | undefined;

  type DialogState = 'form' | 'loading' | 'success' | 'error';
  const isBetting = writable<string | undefined>();
  const dialogState = writable<DialogState>('form');

  $: options = Object.values(bet.options);
  $: cardOptions = options.map((option) => ({
    ...option,
    amount: option.amount === undefined ? undefined : Number(option.amount)
  }));
  $: totalVotes = options.reduce((sum, opt) => sum + Number(opt.amount || 0), 0);
  $: tokenSymbol = bet.currencyInfo?.symbol ?? 'XRD';
  $: tokenIconUrl = bet.currencyInfo?.iconUrl ?? '/icon-xrd.png';
  $: isNonXrd = bet.currencyInfo != null && bet.currencyInfo.symbol !== 'XRD';

  let accountBalance: number | null = null;
  let balanceCheckVersion = 0;

  $: {
    const addressToCheck = selectedAccount ?? $account?.address;
    if (addressToCheck) {
      accountBalance = null;
      const version = ++balanceCheckVersion;
      EntityFactory.accountFrom(addressToCheck).then((radixAccount) => {
        if (version === balanceCheckVersion) {
          accountBalance = radixAccount.getFungibleAmount(bet.currency) ?? 0;
        }
      }).catch(() => {
        if (version === balanceCheckVersion) {
          accountBalance = 0;
        }
      });
    }
  }

  $: hasInsufficientBalance = accountBalance !== null && accountBalance < amount;
  $: hasRequiredToken = accountBalance === null ? null : accountBalance > 0;

  const getPotentialPrize = (betSize: number) => {
    const numberOfVotes = Number(options.find((a) => a.name === $isBetting)?.amount) || 1;
    const myShare = betSize / (numberOfVotes + betSize);
    return Math.ceil(myShare * (totalVotes - numberOfVotes)) + betSize;
  };

  const handleAmountChange = (delta: number) => {
    const next = Math.max(1, amount + delta);
    amount = next;
    toWin = getPotentialPrize(amount);
  };

  const handleAmountInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value) || 0;
    amount = Math.max(0, val);
    toWin = getPotentialPrize(amount);
  };

  const vote = ({ detail }: CustomEvent<string>) => {
    amount = 200;
    dialogState.set('form');
    isBetting.set(detail);
    selectedAccount = $account?.address;
    toWin = getPotentialPrize(amount);
  };

  const hideModal = () => {
    isBetting.set(undefined);
  };

  const tryAgain = () => {
    dialogState.set('form');
  };

  const submitBet = async () => {
    if (!selectedAccount) {
      window.alert('Please login using your wallet first!');
      return;
    }

    dialogState.set('loading');
    try {
      const { manifest: transactionManifest, voteIntentId } = await http.post<{
        manifest: string;
        voteIntentId?: string;
      }>('/api/manifests/vote', {
        bet,
        option: $isBetting,
        amount,
        payer: selectedAccount
      });

      const txResult = await $rdt.walletApi.sendTransaction({
        transactionManifest,
        message: `Bet on "${$isBetting}" in "${bet.name}" on radix.bet!`
      });

      if (txResult.isErr()) {
        dialogState.set('error');
        return;
      }

      // Confirm the vote intent with the transaction ID
      if (voteIntentId && txResult.isOk()) {
        http
          .post('/api/vote/confirm', {
            voteIntentId,
            transactionId: txResult.value.transactionIntentHash
          })
          .catch(() => {});
      }

      dialogState.set('success');
    } catch {
      dialogState.set('error');
    }
  };
</script>

<Box>
  {#if variant === 'detail'}
    <BetDetailCard
      name={bet.name}
      options={cardOptions}
      on:vote={vote}
      {totalVotes}
      enabled={!bet.disabled}
      enrichedStatus={bet.enrichedStatus}
      winningOptionName={bet.winningOptionName}
      endsAt={bet.endsAt}
      currencyInfo={bet.currencyInfo}
    />
  {:else}
    <BetCard
      componentAddress={bet.component}
      slug={bet.slug}
      name={bet.name}
      options={cardOptions}
      on:vote={vote}
      {totalVotes}
      enabled={!bet.disabled}
      enrichedStatus={bet.enrichedStatus}
      winningOptionName={bet.winningOptionName}
      endsAt={bet.endsAt}
      currencyInfo={bet.currencyInfo}
    />
  {/if}

  {#if $isBetting}
    <div class="modal-backdrop" on:click={hideModal} on:keydown={(e) => e.key === 'Escape' && hideModal()} role="button" tabindex="-1">
      <div class="modal-panel" on:click|stopPropagation role="presentation">
        <button class="modal-close" on:click={hideModal} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {#if $dialogState === 'success'}
          <div class="result-state">
            <div class="success-icon">
              <svg class="checkmark" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="24" fill="none" />
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 class="result-title">{$i18n.t('bet:betting_complete')}</h3>
            <p class="result-subtitle">Your bet has been placed successfully</p>
            <Anchor href="/bet/{bet.slug || bet.component}" underline={false} class="result-link">
              <button class="btn-primary" on:click={hideModal}>See your bets</button>
            </Anchor>
          </div>
        {:else if $dialogState === 'error'}
          <div class="result-state result-error">
            <div class="error-icon-wrapper">
              <div class="error-icon">
                <svg class="xmark" viewBox="0 0 52 52">
                  <circle class="xmark-circle" cx="26" cy="26" r="24" fill="none" />
                  <line class="xmark-line1" x1="16" y1="16" x2="36" y2="36" />
                  <line class="xmark-line2" x1="36" y1="16" x2="16" y2="36" />
                </svg>
              </div>
            </div>
            <h3 class="result-title result-title-error">Transaction Failed</h3>
            <p class="result-subtitle">The transaction was rejected or cancelled. No funds were taken.</p>
            <button class="btn-secondary" on:click={tryAgain}>Try Again</button>
          </div>
        {:else}
          <div class="form-state">
            <div class="form-header">
              <span class="form-label-sm">Placing bet</span>
              <h3 class="form-title">
                <strong>{$isBetting}</strong>
                <span class="form-title-sub">in {bet.name}</span>
              </h3>
            </div>

            {#if $accounts.length > 1}
              <div class="account-section">
                <label class="amount-label" for="bet-account">Pay from account</label>
                <select id="bet-account" class="account-select" bind:value={selectedAccount}>
                  {#each $accounts as acc}
                    <option value={acc.address}>
                      {acc.label || `${acc.address.slice(0, 12)}...${acc.address.slice(-6)}`}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}

            {#if isNonXrd}
              <div class="token-notice">
                <img src={tokenIconUrl} alt={tokenSymbol} class="token-notice-icon" on:error={(e) => { e.currentTarget.src = '/icon-xrd.png'; }} />
                <span>This bet uses <strong>{tokenSymbol}</strong>{bet.currencyInfo?.name ? ` (${bet.currencyInfo.name})` : ''}</span>
              </div>
            {/if}

            <div class="amount-section">
              <label class="amount-label" for="bet-amount">Bet size</label>
              <div class="amount-input-row">
                <button class="amount-step" on:click={() => handleAmountChange(-100)} disabled={amount <= 100}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <div class="amount-field">
                  <img src={tokenIconUrl} alt={tokenSymbol} class="xrd-icon" on:error={(e) => { e.currentTarget.src = '/icon-xrd.png'; }} />
                  <input
                    id="bet-amount"
                    type="number"
                    bind:value={amount}
                    on:input={handleAmountInput}
                    min="1"
                  />
                </div>
                <button class="amount-step" on:click={() => handleAmountChange(100)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>

            <div class="potential-win">
              <span class="potential-win-label">Potential return</span>
              <span class="potential-win-amount">{toWin} {tokenSymbol}</span>
            </div>

            {#if hasInsufficientBalance}
              <div class="no-token-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div>
                  {#if accountBalance === 0}
                    <strong>You don't have any {tokenSymbol}</strong>
                    <p class="no-token-hint">This bet requires {bet.currencyInfo?.name || tokenSymbol} tokens to participate.{#if isNonXrd} Join <a href="https://t.me/radixbet" target="_blank" rel="noopener">#Telegram</a> to get some!{/if}</p>
                  {:else}
                    <strong>Insufficient {tokenSymbol} balance</strong>
                    <p class="no-token-hint">You have {accountBalance} {tokenSymbol} but this bet requires {amount}.</p>
                  {/if}
                </div>
              </div>
            {/if}

            <button
              class="btn-submit"
              class:btn-loading={$dialogState === 'loading'}
              on:click={submitBet}
              disabled={$dialogState === 'loading' || amount <= 0 || hasInsufficientBalance}
            >
              {#if $dialogState === 'loading'}
                <span class="spinner"></span>
                {$i18n.t('wallet:check_wallet')}
              {:else}
                {$i18n.t('wallet:submit')}
              {/if}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</Box>

<style lang="scss">
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
    animation: fadeIn 0.15s ease-out;
  }

  .modal-panel {
    position: relative;
    background: var(--color-bg-primary);
    border-radius: var(--radius-xl);
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 400px;
    max-height: calc(100vh - var(--spacing-xl) * 2);
    overflow-y: auto;
    padding: var(--spacing-xl);
    animation: slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }
  }

  /* Form state */
  .form-state {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .form-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label-sm {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--color-text-muted);
  }

  .form-title {
    font-size: var(--font-size-xl);
    font-weight: 400;
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.3;

    strong {
      font-weight: 700;
    }
  }

  .form-title-sub {
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
  }

  .token-notice {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 10px var(--spacing-md);
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);

    .token-notice-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      border-radius: 50%;
    }

    strong {
      color: var(--color-text-primary);
      font-weight: 600;
    }
  }

  .amount-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .amount-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .account-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .account-select {
    width: 100%;
    height: 44px;
    padding: 0 var(--spacing-md);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.15s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;

    &:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
      outline: none;
    }
  }

  .amount-input-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .amount-step {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: var(--color-bg-hover);
      border-color: var(--color-text-muted);
      color: var(--color-text-primary);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .amount-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 0 var(--spacing-md);
    height: 44px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all 0.15s ease;

    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .xrd-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    input {
      flex: 1;
      border: none;
      background: none;
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      outline: none;
      min-width: 0;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        appearance: none;
        margin: 0;
      }
      -moz-appearance: textfield;
      appearance: textfield;
    }
  }

  .no-token-warning {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    color: var(--color-danger);

    strong {
      display: block;
      font-size: var(--font-size-sm);
      margin-bottom: 2px;
    }

    .no-token-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.4;

      a {
        color: var(--color-primary);
        text-decoration: underline;
      }
    }
  }

  .potential-win {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background: var(--color-success-bg);
    border: 1px solid rgba(22, 199, 132, 0.2);
    border-radius: var(--radius-md);
  }

  .potential-win-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .potential-win-amount {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-success);
  }

  .btn-submit {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 82, 240, 0.3);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.btn-loading {
      opacity: 0.85;
      cursor: wait;
    }
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* Result states */
  .result-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg) 0 var(--spacing-sm);
  }

  .result-title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .result-title-error {
    color: var(--color-danger);
  }

  .result-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-sm) 0;
    max-width: 260px;
    line-height: 1.5;
  }

  :global(.result-link) {
    width: 100%;
    text-decoration: none !important;
  }

  .btn-primary {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .btn-secondary {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
      border-color: var(--color-text-muted);
    }
  }

  /* Success animation */
  .success-icon {
    width: 72px;
    height: 72px;
    margin-bottom: var(--spacing-sm);
  }

  .checkmark {
    width: 72px;
    height: 72px;
  }

  .checkmark-circle {
    stroke: var(--color-success);
    stroke-width: 2;
    stroke-dasharray: 151;
    stroke-dashoffset: 151;
    animation: circleIn 0.5s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }

  .checkmark-check {
    stroke: var(--color-success);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: checkIn 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
  }

  /* Error animation */
  .error-icon-wrapper {
    animation: shakeIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
    margin-bottom: var(--spacing-sm);
  }

  .error-icon {
    width: 72px;
    height: 72px;
  }

  .xmark {
    width: 72px;
    height: 72px;
  }

  .xmark-circle {
    stroke: var(--color-danger);
    stroke-width: 2;
    fill: none;
    stroke-dasharray: 151;
    stroke-dashoffset: 151;
    animation: circleIn 0.5s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }

  .xmark-line1,
  .xmark-line2 {
    stroke: var(--color-danger);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 28;
    stroke-dashoffset: 28;
  }

  .xmark-line1 {
    animation: checkIn 0.25s cubic-bezier(0.65, 0, 0.45, 1) 0.35s forwards;
  }

  .xmark-line2 {
    animation: checkIn 0.25s cubic-bezier(0.65, 0, 0.45, 1) 0.45s forwards;
  }

  /* Keyframes */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes circleIn {
    to { stroke-dashoffset: 0; }
  }

  @keyframes checkIn {
    to { stroke-dashoffset: 0; }
  }

  @keyframes shakeIn {
    0% { transform: scale(0.8); opacity: 0; }
    40% { transform: scale(1.05); opacity: 1; }
    50% { transform: translateX(-6px); }
    60% { transform: translateX(5px); }
    70% { transform: translateX(-4px); }
    80% { transform: translateX(2px); }
    100% { transform: translateX(0); }
  }
</style>
