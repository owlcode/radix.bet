<script lang="ts">
  import { onMount } from 'svelte';
  import { md } from './markdown';

  export let filePath: string;

  let content: string;

  onMount(() => {
    fetch(new Request(`/content/en/${filePath}`))
      .then((data) => data.text())
      .then((text) => {
        content = text;
      });
  });
</script>

{#if content}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Markdown content is sanitized -->
  {@html md.render(content)}
{/if}
