<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from 'svelte-icons-pack';
  import {
    RiSystemAddCircleLine,
    RiSystemSearchLine
  } from 'svelte-icons-pack/ri';
  import { i18n } from '$lib/i18n';
  import type { ApiBetSearchResult } from '$lib/model/bet';
  import { goto } from '$app/navigation';
  import { account } from '$lib/stores/rdt';

  let searchQuery = '';
  let mobileMenuOpen = false;
  let mobileSearchQuery = '';

  // Search autocomplete
  let searchResults: ApiBetSearchResult[] = [];
  let showSearchDropdown = false;
  let searchDebounceTimer: ReturnType<typeof setTimeout>;

  async function fetchSearchResults(query: string) {
    if (query.trim().length < 2) {
      searchResults = [];
      showSearchDropdown = false;
      return;
    }
    try {
      const res = await fetch(`/api/bets?search=${encodeURIComponent(query.trim())}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        searchResults = data.bets || [];
        showSearchDropdown = searchResults.length > 0;
      }
    } catch {
      searchResults = [];
      showSearchDropdown = false;
    }
  }

  function handleSearchInput(query: string) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => fetchSearchResults(query), 300);
  }

  function handleSearchBlur() {
    setTimeout(() => { showSearchDropdown = false; }, 200);
  }

  function navigateToResult(result: ApiBetSearchResult) {
    const target = result.slug || result.componentAddress;
    goto(`/bet/${target}`);
    searchQuery = '';
    mobileSearchQuery = '';
    showSearchDropdown = false;
  }

  function handleSearch(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showSearchDropdown = false;
      return;
    }
    if (e.key === 'Enter' && searchQuery.trim()) {
      showSearchDropdown = false;
      goto(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleMobileSearch(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showSearchDropdown = false;
      return;
    }
    if (e.key === 'Enter' && mobileSearchQuery.trim()) {
      showSearchDropdown = false;
      goto(`/?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
      mobileMenuOpen = false;
    }
  }

  function handleSearchFocus(e: FocusEvent) {
    (e.target as HTMLInputElement)?.select();
  }

  onMount(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') mobileMenuOpen = false;
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });
</script>

<header class="header">
  <div class="header-main">
    <div class="header-left">
      <a href="/" class="logo-link">
        <div class="logo">
          <span class="logo-icon">🎲</span>
          <span class="logo-text">radix.bet</span>
        </div>
      </a>

      <div class="search-container">
        <span class="search-icon-wrapper"><Icon src={RiSystemSearchLine} size="16" /></span>
        <input
          type="text"
          placeholder={$i18n.t('nav:search_markets')}
          class="search-input"
          bind:value={searchQuery}
          on:keydown={handleSearch}
          on:input={() => handleSearchInput(searchQuery)}
          on:blur={handleSearchBlur}
          on:focus={handleSearchFocus}
        />
        <span class="search-shortcut">/</span>

        {#if showSearchDropdown}
          <div class="search-dropdown">
            {#each searchResults as result}
              <button
                class="search-result"
                on:mousedown|preventDefault={() => navigateToResult(result)}
              >
                <span class="result-name">{result.name}</span>
                <span class="status-badge status-{result.enrichedStatus}">
                  {result.enrichedStatus}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <nav class="nav-links">
      {#if $account}
        <a href="/me" class="nav-link">{$i18n.t('nav:me')}</a>
      {/if}
      <a href="/leaderboard" class="nav-link">{$i18n.t('nav:leaderboard')}</a>
      <a href="/how-it-works" class="nav-link">{$i18n.t('nav:how_it_works')}</a>
    </nav>

    <div class="header-right">
      {#if $account}
        <a href="/bet/create" class="create-btn">
          <Icon src={RiSystemAddCircleLine} size="18" />
          <span class="create-btn-text">{$i18n.t('nav:create_bet')}</span>
        </a>
      {/if}

      <div class="connect-button">
        <radix-connect-button />
      </div>

      <button class="hamburger-btn" on:click={() => (mobileMenuOpen = true)} aria-label="Open menu">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</header>

{#if mobileMenuOpen}
  <div class="mobile-backdrop" on:click={() => (mobileMenuOpen = false)} role="presentation"></div>
  <nav class="mobile-menu" aria-label="Mobile navigation">
    <div class="mobile-menu-header">
      <span class="mobile-menu-title">{$i18n.t('nav:menu')}</span>
      <button
        class="mobile-close-btn"
        on:click={() => (mobileMenuOpen = false)}
        aria-label="Close menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <div class="mobile-search">
      <div class="mobile-search-wrapper">
        <span class="mobile-search-icon"><Icon src={RiSystemSearchLine} size="16" /></span>
        <input
          type="text"
          placeholder={$i18n.t('nav:search_markets')}
          class="mobile-search-input"
          bind:value={mobileSearchQuery}
          on:keydown={handleMobileSearch}
          on:input={() => handleSearchInput(mobileSearchQuery)}
          on:blur={handleSearchBlur}
        />
      </div>
      {#if showSearchDropdown}
        <div class="mobile-search-dropdown">
          {#each searchResults as result}
            <button
              class="search-result"
              on:mousedown|preventDefault={() => {
                navigateToResult(result);
                mobileMenuOpen = false;
              }}
            >
              <span class="result-name">{result.name}</span>
              <span class="status-badge status-{result.enrichedStatus}">
                {result.enrichedStatus}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <div class="mobile-priority-links">
      {#if $account}
        <a href="/bet/create" class="mobile-priority-link" on:click={() => (mobileMenuOpen = false)}>
          <Icon src={RiSystemAddCircleLine} size="18" />
          <span>{$i18n.t('nav:create_bet')}</span>
        </a>
        <a href="/me" class="mobile-priority-link" on:click={() => (mobileMenuOpen = false)}>
          <span>{$i18n.t('nav:my_account')}</span>
        </a>
      {/if}
      <a href="/leaderboard" class="mobile-priority-link" on:click={() => (mobileMenuOpen = false)}>
        <span class="mobile-cat-icon">🏆</span>
        <span>{$i18n.t('nav:leaderboard')}</span>
      </a>
    </div>
    <div class="mobile-categories">
      <a href="/how-it-works" class="mobile-category-link" on:click={() => (mobileMenuOpen = false)}>
        <span>{$i18n.t('nav:how_it_works')}</span>
      </a>
    </div>
    {#if $account}
    <div class="mobile-menu-footer">
      <a href="/bet/create" class="mobile-create-btn" on:click={() => (mobileMenuOpen = false)}>
        <Icon src={RiSystemAddCircleLine} size="18" />
        {$i18n.t('nav:create_bet')}
      </a>
    </div>
  {/if}
  </nav>
{/if}

<style lang="scss">
  .header {
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-main {
    padding: 0 var(--spacing-lg);
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .logo-link {
    text-decoration: none;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;

    .logo-icon {
      font-size: 22px;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-text-primary);
      letter-spacing: -0.5px;
    }
  }

  .search-container {
    position: relative;
    display: flex;
    align-items: center;

    .search-icon-wrapper {
      position: absolute;
      left: 12px;
      color: var(--color-text-muted);
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 240px;
      padding: 8px 36px 8px 36px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      transition: all 0.15s ease;

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        background: var(--color-bg-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
      }
    }

    .search-shortcut {
      position: absolute;
      right: 10px;
      padding: 1px 5px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 500;
    }
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-left: auto;

    .nav-link {
      padding: 6px 12px;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-hover);
      }

    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .create-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--color-primary);
    color: white;
    text-decoration: none;
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(22, 82, 240, 0.3);

    &:hover {
      background: var(--color-primary-hover);
      box-shadow: 0 4px 12px rgba(22, 82, 240, 0.35);
      transform: translateY(-1px);
    }

    &:active {
      transform: scale(0.97) translateY(0);
      box-shadow: 0 1px 2px rgba(22, 82, 240, 0.3);
    }
  }

  .connect-button {
    height: 36px;
    display: flex;
    align-items: center;
  }

  @media (max-width: 1200px) {
    .nav-links {
      display: none;
    }

    .hamburger-btn {
      display: flex;
    }
  }

  @media (max-width: 768px) {
    .header-main {
      padding: 0 var(--spacing-md);
      height: 52px;
      gap: var(--spacing-sm);
    }

    .search-container {
      display: none;
    }

    .logo .logo-icon {
      font-size: 24px;
    }

    .create-btn {
      padding: 6px 10px;

      .create-btn-text {
        display: none;
      }
    }

    .header-right {
      gap: 4px;
    }
  }

  .hamburger-btn {
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-primary);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-md);
    margin-left: 2px;

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  /* Mobile menu */
  .mobile-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .mobile-menu {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    max-width: 85vw;
    background: var(--color-bg-primary);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .mobile-menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .mobile-menu-title {
    font-weight: 600;
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
  }

  .mobile-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }
  }

  .mobile-search {
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .mobile-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .mobile-search-icon {
    position: absolute;
    left: 10px;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .mobile-search-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);

    &::placeholder {
      color: var(--color-text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .mobile-categories {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-xs) 0;
  }

  .mobile-priority-links {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-xs) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .mobile-priority-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 12px var(--spacing-lg);
    color: var(--color-text-primary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: background 0.1s ease;

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .mobile-category-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 10px var(--spacing-lg);
    color: var(--color-text-primary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: background 0.1s ease;

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .mobile-cat-icon {
    width: 24px;
    text-align: center;
    font-size: 16px;
  }

  .mobile-menu-footer {
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--color-border);
  }

  .mobile-create-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px var(--spacing-md);
    background: var(--color-primary);
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: var(--font-size-sm);
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .search-dropdown, .mobile-search-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    overflow: hidden;
  }

  .search-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
    font-size: 0.85rem;

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .result-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 8px;
  }

  .status-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    text-transform: uppercase;
    font-weight: 600;
  }

  .status-active {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
  }

  .status-ended, .status-resolved {
    background: rgba(156, 163, 175, 0.15);
    color: rgb(156, 163, 175);
  }

  .mobile-search-dropdown {
    position: relative;
    margin-top: 4px;
    border-radius: var(--radius-md);
  }
</style>
