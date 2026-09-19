<script lang="ts">
  import { config, networkId } from '$lib/config';
  import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
  import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit';
  // Dynamic wallet token type (replaces static TokenInfo)
  interface WalletToken {
    address: string;
    name: string;
    symbol: string;
    iconUrl: string;
  }
  import { rdt } from '$lib/stores/rdt';
  import { writable } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import { http } from '$lib/http';
  import { Icon } from 'svelte-icons-pack';
  import {
    RiSystemAddLine,
    RiMediaImageLine,
    RiSystemDeleteBinLine,
    RiSystemCheckLine,
    RiArrowsArrowDownSLine,
    RiSystemCloseLine
  } from 'svelte-icons-pack/ri';

  // Close dropdown when clicking outside
  let currencySelectorRef: HTMLDivElement;

  function handleClickOutside(event: MouseEvent) {
    if (currencySelectorRef && !currencySelectorRef.contains(event.target as Node)) {
      showCurrencyDropdown = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    void loadRuntimeConfig();
  });

  let walletDataSubscription: { unsubscribe: () => void } | undefined;
  let walletAccounts: WalletDataStateAccount[] = [];

  $: if ($rdt && !walletDataSubscription) {
    walletDataSubscription = $rdt.walletApi.walletData$.subscribe((walletData) => {
      walletAccounts = walletData.accounts;
      if (!selectedAccount && walletAccounts.length > 0) {
        selectedAccount = walletAccounts[0].address;
      }
      // Load tokens for all connected accounts
      void loadWalletTokens(walletData.accounts.map((a) => a.address));
    });
  }

  onDestroy(() => {
    walletDataSubscription?.unsubscribe();
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleClickOutside);
    }
  });

  // Initialize with tomorrow's date at noon
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  tomorrow.setHours(12, 0, 0, 0);

  let name: string = '';
  let description: string = '';
  let deadline: string = tomorrow.toISOString().slice(0, 16);
  let selectedAccount: string = '';
  let categoryId: string = '';
  let resolutionSource: string = '';
  let verifierCount: number = 1;

  interface CategoryOption {
    id: string;
    slug: string;
    nameKey: string;
    isSystem: boolean;
  }

  let categories: CategoryOption[] = [];

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        categories = data.categories;
        if (categories.length > 0 && !categoryId) {
          categoryId = categories[0].id;
        }
      }
    } catch {
      // Fallback to empty — categories are optional
    }
  };

  // Currency selection — dynamic from wallet
  const network =
    (networkId as number) === (RadixNetwork.Mainnet as number) ? 'mainnet' : 'stokenet';
  let walletTokens: WalletToken[] = [];
  let tokensLoading = true;
  let selectedToken: WalletToken | undefined;
  let showCurrencyDropdown = false;
  let useCustomToken = false;
  let customTokenAddress = '';
  let customTokenError = '';
  let packageAddress = config.publicBetV1;

  async function loadWalletTokens(accounts: string[]) {
    if (accounts.length === 0) return;
    tokensLoading = true;
    try {
      const res = await fetch(`/api/account-tokens?accounts=${accounts.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        walletTokens = data.tokens;
        if (!selectedToken && walletTokens.length > 0) {
          selectedToken = walletTokens[0]; // XRD is first (sorted by API)
        }
      }
    } catch {
      // Fallback — empty list
    } finally {
      tokensLoading = false;
    }
  }

  const loadRuntimeConfig = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data?.radixPackageAddress === 'string' && data.radixPackageAddress.trim()) {
        packageAddress = data.radixPackageAddress.trim();
      }
    } catch {
      // Keep static fallback if runtime config cannot be loaded.
    }
  };

  // Get the token resource address for the transaction
  $: selectedTokenAddress = useCustomToken ? customTokenAddress : (selectedToken?.address || '');

  // Validate custom token address
  function validateCustomTokenAddress(address: string): boolean {
    if (!address) return false;
    // Radix resource addresses start with 'resource_' followed by network prefix
    const stokenetPattern = /^resource_tdx_2_[a-z0-9]+$/;
    const mainnetPattern = /^resource_rdx[a-z0-9]+$/;
    return network === 'stokenet' ? stokenetPattern.test(address) : mainnetPattern.test(address);
  }

  function selectToken(token: WalletToken) {
    selectedToken = token;
    useCustomToken = false;
    customTokenAddress = '';
    customTokenError = '';
    showCurrencyDropdown = false;
  }

  function enableCustomToken() {
    useCustomToken = true;
    showCurrencyDropdown = false;
  }

  function handleCustomTokenInput() {
    if (customTokenAddress && !validateCustomTokenAddress(customTokenAddress)) {
      customTokenError = 'Invalid resource address format';
    } else {
      customTokenError = '';
    }
  }

  interface BetOption {
    name: string;
    resourceIcon: string;
    uploading?: boolean;
    uploadError?: string;
  }

  const DEFAULT_YES_IMAGE = 'https://placehold.co/400x400';
  const DEFAULT_NO_IMAGE = 'https://placehold.co/400x400';

  let options: BetOption[] = [
    { name: 'Yes', resourceIcon: DEFAULT_YES_IMAGE },
    { name: 'No', resourceIcon: DEFAULT_NO_IMAGE }
  ];

  // Preset templates
  const presets = [
    {
      id: 'yesno',
      name: 'Yes / No',
      description: 'Simple binary outcome',
      options: [
        { name: 'Yes', resourceIcon: DEFAULT_YES_IMAGE },
        { name: 'No', resourceIcon: DEFAULT_NO_IMAGE }
      ],
      category: 'other'
    },
    {
      id: 'crypto',
      name: 'Crypto Price',
      description: 'Price target prediction',
      options: [
        { name: 'Reaches Target', resourceIcon: DEFAULT_YES_IMAGE },
        { name: 'Below Target', resourceIcon: DEFAULT_NO_IMAGE }
      ],
      category: 'crypto'
    },
    {
      id: 'sports',
      name: 'Sports Match',
      description: 'Two-team competition',
      options: [
        { name: 'Team A', resourceIcon: DEFAULT_YES_IMAGE },
        { name: 'Team B', resourceIcon: DEFAULT_NO_IMAGE },
        { name: 'Draw', resourceIcon: '' }
      ],
      category: 'sports'
    },
    {
      id: 'election',
      name: 'Election',
      description: 'Multi-candidate race',
      options: [
        { name: 'Candidate A', resourceIcon: DEFAULT_YES_IMAGE },
        { name: 'Candidate B', resourceIcon: DEFAULT_NO_IMAGE },
        { name: 'Other', resourceIcon: '' }
      ],
      category: 'politics'
    }
  ];

  const applyPreset = (preset: (typeof presets)[0]) => {
    options = preset.options.map((o) => ({ ...o }));
    // Find matching category by slug from preset
    const matchedCategory = categories.find((c) => c.slug === preset.category);
    if (matchedCategory) categoryId = matchedCategory.id;
  };

  const addOption = () => {
    options = [...options, { name: '', resourceIcon: '' }];
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      options = options.filter((_, i) => i !== index);
    }
  };

  function isValidAbsoluteUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // File upload handler
  const uploadImage = async (index: number, event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    options[index].uploading = true;
    options[index].uploadError = undefined;
    options = [...options]; // Trigger reactivity

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        options[index].resourceIcon = data.url;
      } else {
        const err = await res.json();
        options[index].uploadError = err.message || 'Upload failed';
      }
    } catch {
      options[index].uploadError = 'Upload failed';
    } finally {
      options[index].uploading = false;
      options = [...options];
    }
  };

  const isLoading = writable<boolean>(false);
  const error = writable<string>('');
  let output: string;

  const createBet = async () => {
    error.set('');

    // Validation
    if (!name.trim()) {
      error.set('Please enter a bet name');
      return;
    }
    if (options.some((o) => !o.name.trim())) {
      error.set('Please fill in all option names');
      return;
    }
    if (!selectedAccount) {
      error.set('Please select an account');
      return;
    }

    // Validate custom token address if using custom token
    if (useCustomToken) {
      if (!customTokenAddress) {
        error.set('Please enter a custom token address');
        return;
      }
      if (!validateCustomTokenAddress(customTokenAddress)) {
        error.set('Invalid custom token address format');
        return;
      }
    }

    function sanitizeManifestString(input: string): string {
      return input
        .replace(/["\\]/g, '')
        .replace(/[\n\r]/g, ' ')
        .trim();
    }

    if (options.some((o) => !o.resourceIcon)) {
      error.set('All options must have an image URL');
      return;
    }
    const invalidUrlOption = options.find((o) => !isValidAbsoluteUrl(o.resourceIcon));
    if (invalidUrlOption) {
      error.set('Image URLs must be absolute URLs (starting with http:// or https://)');
      return;
    }

    isLoading.set(true);
    const tokenAddress = selectedTokenAddress;
    if (!packageAddress.startsWith('package_')) {
      error.set('Package address is not configured. Please contact support.');
      isLoading.set(false);
      return;
    }

    const txResult = await $rdt.walletApi.sendTransaction({
      transactionManifest: `
        CALL_FUNCTION
            Address("${packageAddress}")
            "PublicBetMultipleWinners"
            "create_bet"
            Address("${tokenAddress}")
            Array<String>(
                ${options.map((option) => `"${sanitizeManifestString(option.name)}"`).join(',')}
            )
            Array<String>(
                ${options.map((option) => `"${sanitizeManifestString(option.resourceIcon)}"`).join(',')}
            )
            "${sanitizeManifestString(name)}"
            ${Math.floor(new Date(deadline).valueOf() / 1000)}i64
            ${verifierCount}u8
        ;
        CALL_METHOD
            Address("${selectedAccount}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP")
        ;
      `
    });

    if (txResult.isErr()) {
      error.set('Transaction failed. Please try again.');
      isLoading.set(false);
      return;
    }

    try {
      const apiResult = await http.post('/api/bet', {
        transactionIntentHash: txResult.value.transactionIntentHash,
        description: description || null,
        categoryId: null
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = apiResult as any;
      isLoading.set(false);
      if (result?.component) {
        window.location.href = `/bet/${result.component}`;
        return;
      }
      output = result;
    } catch {
      error.set('Transaction submitted but failed to save. Please try again.');
      isLoading.set(false);
    }
  };
</script>

<svelte:head>
  <title>Create Bet - radix.bet</title>
</svelte:head>

<main class="create-page">
  <div class="container">
    <div class="page-header">
      <h1>Create a New Bet</h1>
      <p>Set up a prediction bet and let the crowd decide the outcome.</p>
    </div>

    <!-- 
    <div class="presets-section">
      <h2 class="section-title">Quick Start Templates</h2>
      <div class="presets-grid">
        {#each presets as preset}
          <button type="button" class="preset-card" on:click={() => applyPreset(preset)}>
            <span class="preset-name">{preset.name}</span>
            <span class="preset-description">{preset.description}</span>
          </button>
        {/each}
      </div>
    </div> -->

    <div class="form-grid">
      <!-- Left Column: Bet Details -->
      <div class="form-section">
        <h2 class="section-title">Bet Details</h2>

        <div class="form-group">
          <label class="form-label" for="name">
            Bet Question
            <span class="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            class="form-input"
            placeholder="e.g., Will Bitcoin reach $100K by end of 2025?"
            bind:value={name}
          />
          <span class="form-hint">Be specific and clear about what you're predicting</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="description">Description</label>
          <textarea
            id="description"
            class="form-input form-textarea"
            placeholder="Add more context about the bet, resolution criteria, etc."
            bind:value={description}
            rows="3"
          />
        </div>

        <div class="form-row">
          <!-- Category hidden — using null categoryId
          <div class="form-group">
            <label class="form-label" for="category">Category</label>
            <select id="category" class="form-input form-select" bind:value={categoryId}>
              {#each categories as cat}
                <option value={cat.id}>{cat.slug.charAt(0).toUpperCase() + cat.slug.slice(1)}</option>
              {/each}
            </select>
          </div>
          -->

          <div class="form-group">
            <label class="form-label" for="deadline">
              Resolution Date
              <span class="required">*</span>
            </label>
            <input
              id="deadline"
              type="datetime-local"
              class="form-input"
              bind:value={deadline}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="resolution">Resolution Source</label>
          <input
            id="resolution"
            type="text"
            class="form-input"
            placeholder="e.g., Official announcement, news source URL"
            bind:value={resolutionSource}
          />
          <span class="form-hint">How will the outcome be determined?</span>
        </div>

        <div class="form-group">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="form-label">Bet Currency</label>
          <div class="currency-selector" bind:this={currencySelectorRef}>
            {#if useCustomToken}
              <!-- Custom token input -->
              <div class="custom-token-input">
                <input
                  type="text"
                  class="form-input"
                  class:input-error={customTokenError}
                  placeholder="resource_tdx_2_... or resource_rdx..."
                  bind:value={customTokenAddress}
                  on:input={handleCustomTokenInput}
                />
                <button
                  type="button"
                  class="cancel-custom-btn"
                  on:click={() => {
                    useCustomToken = false;
                    customTokenAddress = '';
                    customTokenError = '';
                  }}
                  title="Use preset token"
                >
                  <Icon src={RiSystemCloseLine} size="16" />
                </button>
              </div>
              {#if customTokenError}
                <span class="token-error">{customTokenError}</span>
              {/if}
              <span class="form-hint">Enter the resource address of the token you want to use</span>
            {:else}
              <!-- Token dropdown -->
              <button
                type="button"
                class="currency-dropdown-trigger"
                on:click={() => (showCurrencyDropdown = !showCurrencyDropdown)}
                disabled={tokensLoading}
              >
                {#if tokensLoading}
                  <span class="token-loading">Loading tokens...</span>
                {:else if selectedToken}
                  {#if selectedToken.iconUrl}
                    <img src={selectedToken.iconUrl} alt={selectedToken.symbol} class="token-icon" />
                  {/if}
                  <div class="token-info">
                    <span class="token-symbol">{selectedToken.symbol}</span>
                    <span class="token-name">{selectedToken.name}</span>
                  </div>
                {:else}
                  <span class="token-loading">No tokens found</span>
                {/if}
                <Icon src={RiArrowsArrowDownSLine} size="20" className="dropdown-arrow" />
              </button>

              {#if showCurrencyDropdown}
                <div class="currency-dropdown">
                  <div class="dropdown-header">Select Currency</div>
                  <div class="dropdown-tokens">
                    {#each walletTokens as token}
                      <button
                        type="button"
                        class="token-option"
                        class:selected={selectedToken?.address === token.address}
                        on:click={() => selectToken(token)}
                      >
                        {#if token.iconUrl}
                          <img src={token.iconUrl} alt={token.symbol} class="token-icon" />
                        {/if}
                        <div class="token-info">
                          <span class="token-symbol">{token.symbol}</span>
                          <span class="token-name">{token.name}</span>
                        </div>
                        {#if selectedToken?.address === token.address}
                          <Icon src={RiSystemCheckLine} size="16" className="check-icon" />
                        {/if}
                      </button>
                    {/each}
                  </div>
                  <div class="dropdown-divider"></div>
                  <button type="button" class="custom-token-option" on:click={enableCustomToken}>
                    <Icon src={RiSystemAddLine} size="18" />
                    <span>Use Custom Token</span>
                  </button>
                </div>
              {/if}
            {/if}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="account">
            Your Account
            <span class="required">*</span>
          </label>
          <select id="account" class="form-input form-select" bind:value={selectedAccount}>
            <option value="">Select an account</option>
            {#if walletAccounts.length}
              {#each walletAccounts as account}
                <option value={account.address}>
                  {account.label || account.address.slice(0, 20) + '...'}
                </option>
              {/each}
            {/if}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="verifiers">Number of Verifiers</label>
          <input
            type="number"
            id="verifiers"
            class="form-input"
            bind:value={verifierCount}
            min="1"
            max="10"
          />
          <span class="form-hint">
            {#if verifierCount === 1}
              You alone will verify the outcome.
            {:else}
              {verifierCount} verifiers must agree on the outcome. Each receives a verifier badge.
            {/if}
          </span>
        </div>
      </div>

      <!-- Right Column: Options -->
      <div class="form-section">
        <h2 class="section-title">Outcome Options</h2>
        <p class="section-description">
          Define the possible outcomes for your bet. Most bets use Yes/No, but you can add more
          options.
        </p>

        <div class="options-list">
          {#each options as option, index}
            <div class="option-card">
              <div class="option-header">
                <span class="option-number">Option {index + 1}</span>
                {#if options.length > 2}
                  <button
                    type="button"
                    class="remove-btn"
                    on:click={() => removeOption(index)}
                    title="Remove option"
                  >
                    <Icon src={RiSystemDeleteBinLine} size="16" />
                  </button>
                {/if}
              </div>

              <div class="form-group">
                <label class="form-label" for="option-{index}">
                  Option Name
                  <span class="required">*</span>
                </label>
                <input
                  id="option-{index}"
                  type="text"
                  class="form-input"
                  placeholder="e.g., Yes, No, Team A, Team B"
                  bind:value={options[index].name}
                />
              </div>

              <div class="form-group">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label class="form-label">
                  <Icon src={RiMediaImageLine} size="14" />
                  Option Image
                  <span class="required">*</span>
                </label>
                <div class="image-upload-area">
                  <input
                    id="file-{index}"
                    type="file"
                    accept="image/*"
                    class="file-input"
                    on:change={(e) => uploadImage(index, e)}
                    disabled={option.uploading}
                  />
                  <label for="file-{index}" class="upload-btn" class:uploading={option.uploading}>
                    {#if option.uploading}
                      <span class="upload-spinner"></span>
                      Uploading...
                    {:else}
                      <Icon src={RiMediaImageLine} size="16" />
                      Upload Image
                    {/if}
                  </label>
                  <span class="or-text">or</span>
                  <input
                    id="image-{index}"
                    type="url"
                    class="form-input url-input"
                    placeholder="Paste image URL"
                    bind:value={options[index].resourceIcon}
                  />
                </div>
                {#if option.uploadError}
                  <span class="upload-error">{option.uploadError}</span>
                {/if}
              </div>

              {#if options[index].resourceIcon}
                <div class="image-preview">
                  <img src={options[index].resourceIcon} alt="Preview" />
                  <button
                    type="button"
                    class="remove-image-btn"
                    on:click={() => {
                      options[index].resourceIcon = '';
                      options = [...options];
                    }}
                  >
                    <Icon src={RiSystemDeleteBinLine} size="14" />
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <button type="button" class="add-option-btn" on:click={addOption}>
          <Icon src={RiSystemAddLine} size="18" />
          Add Another Option
        </button>
      </div>
    </div>

    {#if $error}
      <div class="error-message">
        {$error}
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="submit-btn" on:click={createBet} disabled={$isLoading}>
        {#if $isLoading}
          Creating Bet...
        {:else}
          Create Bet
        {/if}
      </button>
      <p class="submit-hint">A small fee will be deducted to create the bet on-chain.</p>
    </div>

    {#if output}
      <div class="success-message">
        <h3>Bet Created Successfully!</h3>
        <p>Your bet is now live and ready for predictions.</p>
        <pre>{JSON.stringify(output, null, 2)}</pre>
      </div>
    {/if}
  </div>
</main>

<style lang="scss">
  .create-page {
    min-height: calc(100vh - 56px);
    background: var(--color-bg-secondary);
    padding: var(--spacing-lg) 0 var(--spacing-2xl);
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  .page-header {
    margin-bottom: var(--spacing-lg);

    h1 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .create-page {
      padding: var(--spacing-md) 0 var(--spacing-xl);
    }

    .container {
      padding: 0 var(--spacing-md);
    }
  }

  // Preset Templates
  .presets-section {
    margin-bottom: var(--spacing-xl);

    .section-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .presets-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .preset-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .preset-name {
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 4px;
    }

    .preset-description {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-section {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    overflow: hidden;

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .section-title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-md) 0;
  }

  .section-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-lg) 0;
  }

  .form-group {
    margin-bottom: var(--spacing-lg);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  .form-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);

    .required {
      color: var(--color-danger);
    }
  }

  .form-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    font-family: inherit;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition: all 0.15s ease;

    &::placeholder {
      color: var(--color-text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
    cursor: pointer;
  }

  .form-hint {
    display: block;
    margin-top: 6px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  // Currency Selector
  .currency-selector {
    position: relative;
  }

  .currency-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-primary);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;

    &:hover {
      border-color: var(--color-primary-light);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }
  }

  .token-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--color-bg-secondary);
  }

  .token-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .token-symbol {
    font-weight: 600;
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
  }

  .token-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .currency-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    max-height: 400px;
    overflow-y: auto;
  }

  .dropdown-header {
    padding: 12px 14px;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border);
  }

  .dropdown-tokens {
    padding: var(--spacing-xs) 0;
  }

  .token-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;

    &:hover {
      background: var(--color-bg-secondary);
    }

    &.selected {
      background: var(--color-primary-light);
    }

    .token-icon {
      width: 24px;
      height: 24px;
    }

    .token-symbol {
      font-size: var(--font-size-sm);
    }
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--spacing-xs) 0;
  }

  .custom-token-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s ease;
    color: var(--color-primary);
    font-weight: 500;
    font-size: var(--font-size-sm);

    &:hover {
      background: var(--color-primary-light);
    }
  }

  .custom-token-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .form-input {
      flex: 1;
    }
  }

  .cancel-custom-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--color-text-muted);

    &:hover {
      background: var(--color-danger-light);
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }

  .input-error {
    border-color: var(--color-danger) !important;

    &:focus {
      box-shadow: 0 0 0 3px var(--color-danger-light) !important;
    }
  }

  .token-error {
    display: block;
    margin-top: 6px;
    font-size: var(--font-size-xs);
    color: var(--color-danger);
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .option-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .option-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .option-number {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }
  }

  // Image Upload
  .image-upload-area {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .file-input {
    display: none;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    &.uploading {
      opacity: 0.7;
      cursor: wait;
    }
  }

  .upload-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .or-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .url-input {
    flex: 1;
    min-width: 150px;
  }

  .upload-error {
    display: block;
    margin-top: 4px;
    font-size: var(--font-size-xs);
    color: var(--color-danger);
  }

  .image-preview {
    margin-top: var(--spacing-sm);
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--color-border);
    position: relative;

    img {
      display: block;
      width: 100%;
      max-height: 120px;
      object-fit: cover;
    }

    .remove-image-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: var(--color-danger);
      }
    }
  }

  .add-option-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
  }

  .form-actions {
    margin-top: var(--spacing-xl);
    text-align: center;
  }

  .submit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 200px;
    padding: 16px 32px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: white;
    font-size: var(--font-size-md);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  .submit-hint {
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .error-message {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--color-danger-light);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-md);
    color: var(--color-danger);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .success-message {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-xl);
    background: var(--color-success-light);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-lg);
    text-align: center;

    h3 {
      color: var(--color-success);
      margin: 0 0 var(--spacing-sm) 0;
    }

    p {
      color: var(--color-text-secondary);
      margin: 0 0 var(--spacing-md) 0;
    }

    pre {
      text-align: left;
      background: var(--color-bg-primary);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      overflow-x: auto;
      font-size: var(--font-size-xs);
    }
  }
</style>
