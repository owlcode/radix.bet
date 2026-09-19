<script lang="ts">
  import { i18n } from '$lib/i18n';

  import MarkdownI18n from '$lib/ui/molecules/markdown-i18n/MarkdownI18n.svelte';
  import { Box } from '@svelteuidev/core';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<div class="dictionary-header">
  <h1>{$i18n.t(`dictionary:${data.name}`)}</h1>
</div>
<Box p="xl" css={{ maxWidth: '800px', margin: '0 auto' }}>
  <MarkdownI18n filePath={`dictionary/${data.name}.md`} />
</Box>

<style lang="scss">
  .dictionary-header {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-md) var(--spacing-lg);
    background: var(--color-bg-secondary);

    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-text-primary);
      margin: 0;
    }
  }
</style>
