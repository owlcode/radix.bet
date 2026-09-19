<script lang="ts">
  import './app.scss';
  import { SvelteUIProvider } from '@svelteuidev/core';

  import Footer from '$lib/ui/organisms/footer/Footer.svelte';
  import TopBar from '$lib/ui/organisms/top-bar/TopBar.svelte';
  import WaveTransition from '$lib/ui/atoms/wave-transition/WaveTransition.svelte';
  import CookieConsent from '$lib/ui/organisms/cookie-consent/CookieConsent.svelte';

  import { clearRdtLocalStorage, initRdt } from '$lib/stores/rdt';
  import { onMount } from 'svelte';

  import type { LayoutData } from './$types';

  export let data: LayoutData;

  onMount(() => {
    import('@lottiefiles/lottie-player');

    if (!data.isLoggedIn) {
      clearRdtLocalStorage();
    }

    const destroyRdt = initRdt();

    return () => {
      destroyRdt();
    };
  });
</script>

<SvelteUIProvider themeObserver="light" withNormalizeCSS withGlobalStyles>
  {#if data.isStokenet}
    <div class="test-banner">
      This is a test version running on Stokenet. Tokens have no real value.
    </div>
  {/if}
  <TopBar />
  <main class="page-content">
    <slot />
  </main>

  <WaveTransition />
  <Footer />
  <CookieConsent />
</SvelteUIProvider>

<style>
  .test-banner {
    width: 100%;
    background: #f59e0b;
    color: #000;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 0;
  }

  .page-content {
    min-height: calc(100vh - 56px - 200px);
  }
</style>
