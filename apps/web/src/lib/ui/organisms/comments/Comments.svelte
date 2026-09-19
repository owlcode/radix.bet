<script lang="ts">
  import { onMount } from 'svelte';
  import { account } from '$lib/stores/rdt';

  export let componentAddress: string;

  interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: {
      identityAddress: string;
      displayAddress: string;
      displayLabel?: string;
    };
  }

  let comments: Comment[] = [];
  let loading = true;
  let newComment = '';
  let submitting = false;
  let errorMsg = '';

  onMount(async () => {
    await loadComments();
  });

  async function loadComments() {
    try {
      const res = await fetch(`/api/comments?bet=${componentAddress}`);
      if (res.ok) {
        const data = await res.json();
        comments = data.comments || [];
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      loading = false;
    }
  }

  async function submitComment() {
    if (!newComment.trim() || submitting) return;
    submitting = true;
    errorMsg = '';

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentAddress,
          content: newComment.trim()
        })
      });

      if (res.ok) {
        newComment = '';
        await loadComments();
      } else {
        const data = await res.json().catch(() => ({}));
        errorMsg = data.message || 'Failed to post comment';
      }
    } catch {
      errorMsg = 'Network error';
    } finally {
      submitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  }

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 12)}...${addr.slice(-6)}`;
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
</script>

<section class="comments-section">
  <h3 class="comments-title">Discussion ({comments.length})</h3>

  {#if $account}
    <div class="comment-form">
      <textarea
        bind:value={newComment}
        placeholder="Share your thoughts..."
        maxlength="1000"
        rows="2"
        on:keydown={handleKeydown}
        disabled={submitting}
      ></textarea>
      <div class="form-footer">
        {#if errorMsg}
          <span class="error-msg">{errorMsg}</span>
        {/if}
        <span class="char-count">{newComment.length}/1000</span>
        <button
          class="submit-btn"
          on:click={submitComment}
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  {:else}
    <p class="login-prompt">Connect your wallet to join the discussion</p>
  {/if}

  {#if loading}
    <div class="comments-loading">
      <div class="spinner"></div>
    </div>
  {:else if comments.length === 0}
    <p class="no-comments">No comments yet. Be the first to share your take!</p>
  {:else}
    <div class="comments-list">
      {#each comments as comment}
        <div class="comment">
          <div class="comment-header">
            <span class="comment-author">
              {comment.author.displayLabel || truncateAddress(comment.author.displayAddress)}
            </span>
            <span class="comment-time">{timeAgo(comment.createdAt)}</span>
          </div>
          <p class="comment-content">{comment.content}</p>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style lang="scss">
  .comments-section {
    width: 100%;
    margin: 0 auto;
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
  }

  .comments-title {
    font-size: var(--font-size-md, 16px);
    font-weight: 600;
    color: var(--color-text-primary, #111827);
    margin: 0;
    padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .comment-form {
    padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
    border-bottom: 1px solid var(--color-border, #e5e7eb);

    textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-sm, 14px);
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
      background: var(--color-bg-secondary, #f9fafb);
      color: var(--color-text-primary, #111827);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
      }
    }
  }

  .form-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-sm, 8px);
    margin-top: var(--spacing-sm, 8px);
  }

  .char-count {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #9ca3af);
  }

  .error-msg {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-danger, #ef4444);
    margin-right: auto;
  }

  .submit-btn {
    padding: 6px 16px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: var(--font-size-sm, 14px);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .login-prompt {
    padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
    text-align: center;
    color: var(--color-text-muted, #9ca3af);
    font-size: var(--font-size-sm, 14px);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    margin: 0;
  }

  .comments-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .comment {
    padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
    border-bottom: 1px solid var(--color-border-light, #f3f4f6);

    &:last-child {
      border-bottom: none;
    }
  }

  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .comment-author {
    font-size: var(--font-size-sm, 14px);
    font-weight: 600;
    color: var(--color-text-primary, #111827);
    font-family: monospace;
  }

  .comment-time {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #9ca3af);
  }

  .comment-content {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #6b7280);
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .comments-loading,
  .no-comments {
    padding: var(--spacing-lg, 24px);
    text-align: center;
    color: var(--color-text-muted, #9ca3af);
    font-size: var(--font-size-sm, 14px);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border, #e5e7eb);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
