<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  function formatSchedule(
    scheduleType: string,
    scheduleDay: number | null,
    scheduleTime: string
  ): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    switch (scheduleType) {
      case 'DAILY':
        return `Daily at ${scheduleTime} UTC`;
      case 'WEEKLY':
        return `Every ${days[scheduleDay ?? 0]} at ${scheduleTime} UTC`;
      case 'MONTHLY':
        return `${scheduleDay}${getOrdinal(scheduleDay ?? 1)} of each month at ${scheduleTime} UTC`;
      case 'CUSTOM':
        return `One-time at ${scheduleTime} UTC`;
      default:
        return scheduleType;
    }
  }

  function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  }

  async function toggleTemplate(id: string, isActive: boolean) {
    const response = await fetch(`/api/recurring/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    });

    if (response.ok) {
      // Refresh the page to get updated data
      window.location.reload();
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this recurring bet template?')) {
      return;
    }

    const response = await fetch(`/api/recurring/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      window.location.reload();
    }
  }
</script>

<svelte:head>
  <title>Recurring Bets | radix.bet</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
  <div class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white">Recurring Bets</h1>
      <p class="text-gray-400 mt-2">Automatically create bets on a schedule</p>
    </div>
    <a
      href="/bet/recurring/create"
      class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
    >
      Create Template
    </a>
  </div>

  {#if data.templates.length === 0}
    <div class="bg-gray-800/50 rounded-xl p-12 text-center border border-gray-700">
      <div class="text-gray-400 text-lg mb-4">No recurring bet templates yet</div>
      <p class="text-gray-500 mb-6">
        Create a template to automatically generate bets on a schedule. Perfect for weekly
        predictions, daily markets, or monthly events.
      </p>
      <a
        href="/bet/recurring/create"
        class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Create Your First Template
      </a>
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.templates as template}
        <div
          class="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-semibold text-white">{template.name}</h2>
                <span
                  class="px-2 py-1 rounded text-xs font-medium {template.isActive
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-gray-700 text-gray-400'}"
                >
                  {template.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              {#if template.description}
                <p class="text-gray-400 mt-2">{template.description}</p>
              {/if}

              <div class="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    >{formatSchedule(
                      template.scheduleType,
                      template.scheduleDay,
                      template.scheduleTime
                    )}</span
                  >
                </div>

                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span class="capitalize">{template.categoryId || 'Uncategorized'}</span>
                </div>

                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>
                    {template.runCount} runs{template.maxRuns ? ` / ${template.maxRuns} max` : ''}
                  </span>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-500">
                <div class="flex gap-6">
                  <span>Last run: {formatDate(template.lastRunAt)}</span>
                  <span>Next run: {formatDate(template.nextRunAt)}</span>
                </div>
              </div>

              {#if template.betsCreated.length > 0}
                <div class="mt-4">
                  <div class="text-sm text-gray-400 mb-2">Recent bets created:</div>
                  <div class="flex flex-wrap gap-2">
                    {#each template.betsCreated as bet}
                      <a
                        href="/bet/{bet.componentAddress}"
                        class="px-3 py-1 bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </a>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <div class="flex gap-2 ml-4">
              <button
                on:click={() => toggleTemplate(template.id, template.isActive)}
                class="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                title={template.isActive ? 'Pause' : 'Resume'}
              >
                {#if template.isActive}
                  <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                {:else}
                  <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clip-rule="evenodd"
                    />
                  </svg>
                {/if}
              </button>

              <a
                href="/bet/recurring/{template.id}/edit"
                class="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                title="Edit"
              >
                <svg
                  class="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </a>

              <button
                on:click={() => deleteTemplate(template.id)}
                class="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                title="Delete"
              >
                <svg
                  class="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="mt-12 bg-gray-800/30 rounded-xl p-6 border border-gray-700">
    <h3 class="text-lg font-semibold text-white mb-4">About Recurring Bets</h3>
    <div class="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
      <div>
        <h4 class="text-white font-medium mb-2">How it works</h4>
        <ol class="list-decimal list-inside space-y-1">
          <li>Create a recurring bet template with your options</li>
          <li>Set the schedule (daily, weekly, or monthly)</li>
          <li>Pre-approve the transaction with a subintent signature</li>
          <li>The system automatically creates bets on schedule</li>
        </ol>
      </div>
      <div>
        <h4 class="text-white font-medium mb-2">Use cases</h4>
        <ul class="list-disc list-inside space-y-1">
          <li>Weekly sports predictions</li>
          <li>Daily crypto price bets</li>
          <li>Monthly economic indicators</li>
          <li>Regular community polls</li>
        </ul>
      </div>
    </div>
  </div>
</div>
