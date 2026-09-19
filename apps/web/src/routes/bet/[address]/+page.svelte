<script lang="ts">
  import { EntityFactory } from '$lib/gateway';
  import type { PageData } from './$types';
  import { account, rdt } from '$lib/stores/rdt';
  import { i18n } from '$lib/i18n';
  import { config, networkId } from '$lib/config';
  import Bet from '$lib/ui/organisms/bet/Bet.svelte';
  import Timeline from '$lib/ui/molecules/timeline/Timeline.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { invalidateAll } from '$app/navigation';
  import type { RadixAccount } from '$lib/model/radix';
  import { getClaimPrizeManifest } from '$lib/manifests/claim-prize';
  import { getMarkWinnerManifest } from '$lib/manifests/mark-winner';
  import { getSubmitVoteManifest } from '$lib/manifests/submit-vote';
  import { page } from '$app/stores';
  import Comments from '$lib/ui/organisms/comments/Comments.svelte';
  import ActivityFeed from '$lib/ui/organisms/activity-feed/ActivityFeed.svelte';
  import RelatedMarkets from '$lib/ui/organisms/related-markets/RelatedMarkets.svelte';

  function dashboardUrl(address: string) {
    const subdomain = networkId === 1 ? 'dashboard' : 'stokenet-dashboard';
    return `https://${subdomain}.radixdlt.com/account/${address}`;
  }

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 16)}...${addr.slice(-6)}`;
  }
  // import VoteChart from '$lib/ui/molecules/vote-chart/VoteChart.svelte';

  export let data: PageData;

  let copied = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimeout: ReturnType<typeof setTimeout> | undefined;

  // Poll for bet data when pending on-chain confirmation
  onMount(() => {
    if (data.pendingConfirmation) {
      pollTimer = setInterval(() => {
        invalidateAll();
      }, 3000);
      // Stop polling after 60 seconds
      pollTimeout = setTimeout(() => {
        if (pollTimer) clearInterval(pollTimer);
      }, 60000);
    }
  });

  // Stop polling once bet is found
  $: if (data.bet && pollTimer) {
    clearInterval(pollTimer);
    if (pollTimeout) clearTimeout(pollTimeout);
    pollTimer = undefined;
    pollTimeout = undefined;
  }

  function shareOnTwitter() {
    const text = `Check out "${data.bet.name}" on radix.bet - Decentralized prediction markets on Radix!`;
    const url = $page.url.href;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=400'
    );
  }

  async function copyLink() {
    await navigator.clipboard.writeText($page.url.href);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const myBets = writable<{ option: string; amount: string; name: string; image: string }[]>([]);
  const radixAccount = writable<RadixAccount | undefined>();

  const unsub = account.subscribe(async (account) => {
    // Skip wallet queries for off-chain bets
    if (!data.isOnChain) return;
    const status = await data.status;
    if (account && account.address) {
      EntityFactory.accountFrom(account.address).then((account) => {
        radixAccount.set(account);
        if (data.bet) {
          const result = Object.values(data.bet.options)
            .map(({ resourceAddress, name, image }) => {
              if (account.hasFungible(resourceAddress) || account.hasFungible(status.ownerBadge)) {
                return {
                  option: resourceAddress,
                  image,
                  name,
                  amount: account.getFungibleAmount(resourceAddress) || 0
                };
              }
            })
            .filter(Boolean);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          myBets.set(result as any);
        } else {
          console.log(data.bet, data);
        }
      });
    }
  });

  onDestroy(() => {
    unsub();
    if (pollTimer) clearInterval(pollTimer);
    if (pollTimeout) clearTimeout(pollTimeout);
  });

  const cleanUp = (option: string, amount: string) => async () => {
    $rdt.walletApi.sendTransaction({
      message: 'Clean up bets using dustcleaner.xyz',
      transactionManifest: `
        CALL_METHOD
          Address("${$account.address}")
          "withdraw"
          Address("${option}")
          Decimal("${amount}");

        TAKE_FROM_WORKTOP
          Address("${option}")
          Decimal("${amount}")
          Bucket("bucket0");

        CALL_METHOD
          Address("${config.dustCleanerComponent}")
          "deposit"
          Array<Bucket>(Bucket("bucket0"));`
    });
  };

  const markWinner = (winningOption: string) => async () => {
    const status = await data.status;
    $rdt.walletApi.sendTransaction(
      getMarkWinnerManifest(data.bet, winningOption, $account.address, status.ownerBadge)
    );
  };

  const submitVote = (winningOption: string) => async () => {
    const status = await data.status;
    $rdt.walletApi.sendTransaction(
      getSubmitVoteManifest(data.bet, winningOption, $account.address, status.verifierBadge)
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const disableVoting = async () => {
    const status = await data.status;
    $rdt.walletApi.sendTransaction({
      transactionManifest: `
                CALL_METHOD
                    Address("${$account.address}")
                    "create_proof_of_amount"
                    Address("${status.ownerBadge}")
                    Decimal("1");

                CALL_METHOD
                    Address("${data.address}")
                    "disable_voting"
                ;
            `
    });
  };

  const claimPrize = (resource: string) => () => {
    const amount = $radixAccount?.getFungibleAmount(resource);
    $rdt.walletApi.sendTransaction(
      getClaimPrizeManifest(data.bet, $account.address, String(amount || ''), resource)
    );
  };
</script>

{#if data.pendingConfirmation && !data.bet}
  <div class="bet-page">
    <div class="pending-confirmation">
      <div class="spinner"></div>
      <h2>Confirming on-chain...</h2>
      <p>Your bet is being confirmed on the Radix network. This usually takes a few seconds.</p>
    </div>
  </div>
{:else}
  <div class="bet-page">
    <div class="bet-content">
      <div class="bet-content-main">
        <Bet bet={data.bet} variant="detail" />

        <div class="share-bar">
          <button class="share-btn" on:click={shareOnTwitter} title="Share on X/Twitter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
              ><path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              /></svg
            >
            Share
          </button>
          <button class="share-btn" on:click={copyLink} title="Copy link">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              /></svg
            >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {#if data.description}
          <div class="market-description">
            <h3>Resolution Criteria</h3>
            <p>{data.description}</p>
          </div>
        {/if}

        <!-- {#if data.isOnChain}
          <VoteChart betAddress={data.address} />
        {/if} -->

        {#await data.creator then creators}
          {#if creators.length > 0}
            <div class="creator-card">
              <h3 class="creator-label">
                {#await data.status then status}
                  {status.requiredVerifications > 1 ? 'Verifiers' : 'Created by'}
                {/await}
              </h3>
              <div class="creator-addresses">
                {#each creators as address}
                  <a
                    href={dashboardUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="creator-address"
                    title={address}
                  >{truncateAddress(address)}</a>
                {/each}
              </div>
            </div>
          {/if}
        {/await}

        <Comments componentAddress={data.address} />
      </div>

      <div class="bet-content-sidebar">
        {#if data.bet.events}
          <div class="timeline-card">
            <Timeline events={data.bet.events} />
          </div>
        {/if}

        {#if $myBets.length > 0}
          <section class="your-bets-section">
            <h3 class="section-heading">{$i18n.t('bet:your_bets')}</h3>
            <div class="your-bets-grid">
              {#each $myBets as bet}
                <div class="your-bet-card">
                  <img src={bet.image} alt={bet.name} class="your-bet-img" />
                  <div class="your-bet-info">
                    <span class="your-bet-name">{bet.name}</span>
                    <span class="your-bet-amount"
                      >{bet.amount} {data.bet.currencyInfo?.symbol ?? 'XRD'}</span
                    >
                  </div>
                  <div class="your-bet-actions">
                    {#await data.status then status}
                      {#if status.winningOption === bet.name}
                        <button
                          class="action-btn action-btn-claim"
                          on:click={claimPrize(bet.option)}>{$i18n.t('bet:claim')}</button
                        >
                      {:else if status.winningOption !== ''}
                        <button
                          class="action-btn action-btn-cleanup"
                          on:click={cleanUp(bet.option, bet.amount)}
                          >{$i18n.t('bet:clean_up')}</button
                        >
                      {/if}
                      {#if status.requiredVerifications > 1 && $radixAccount?.hasFungible(status.verifierBadge)}
                        <button class="action-btn action-btn-vote" on:click={submitVote(bet.name)}
                          >Submit Verifier Vote</button
                        >
                      {:else if $radixAccount?.hasFungible(status.ownerBadge)}
                        <button class="action-btn action-btn-vote" on:click={markWinner(bet.name)}
                          >{$i18n.t('bet:mark_winner')}</button
                        >
                      {/if}
                    {/await}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <ActivityFeed betAddress={data.address} limit={10} />
        <RelatedMarkets currentAddress={data.address} />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .pending-confirmation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl) var(--spacing-md);
    text-align: center;

    h2 {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
      max-width: 400px;
    }
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .bet-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-lg) var(--spacing-md) 0;
  }

  .share-bar {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .share-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }
  }

  .bet-content {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md) var(--spacing-lg);
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .bet-content-main,
  .bet-content-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    min-width: 0;
  }

  @media (min-width: 960px) {
    .bet-content {
      grid-template-columns: 1fr 380px;
    }
  }

  .market-description {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md) var(--spacing-lg);

    h3 {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      margin: 0 0 var(--spacing-xs) 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  .timeline-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .section-heading {
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-md) 0;
  }

  .your-bets-section {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .your-bets-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .your-bet-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .your-bet-img {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-border);
    flex-shrink: 0;
  }

  .your-bet-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .your-bet-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .your-bet-amount {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .your-bet-actions {
    display: flex;
    gap: var(--spacing-xs);
    flex-shrink: 0;
  }

  .action-btn {
    padding: 6px 14px;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &.action-btn-claim {
      background: var(--color-success);
      color: white;
      &:hover {
        background: var(--color-success-hover);
      }
    }

    &.action-btn-cleanup {
      background: var(--color-bg-hover);
      color: var(--color-text-secondary);
      &:hover {
        background: var(--color-border);
      }
    }

    &.action-btn-vote {
      background: var(--color-primary);
      color: white;
      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }

  .creator-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md) var(--spacing-lg);

    .creator-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      margin: 0 0 var(--spacing-xs) 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .creator-addresses {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .creator-address {
      font-family: monospace;
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  @media (max-width: 640px) {
    .bet-content {
      padding: var(--spacing-lg) var(--spacing-sm);
    }

    .your-bet-card {
      flex-wrap: wrap;
    }

    .your-bet-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
