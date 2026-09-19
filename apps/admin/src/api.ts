const API_BASE = '/api';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      ...options?.headers
    }
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        errorMessage = payload.error;
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// Config API
export async function getConfigs() {
  return fetchApi<{
    configs: Array<{ key: string; value: string; updatedAt: string }>;
  }>('/admin/config');
}

export async function updateConfig(key: string, value: string) {
  return fetchApi<{ success: boolean }>(`/admin/config/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
}

// Oracle API
export interface OracleGame {
  id: string;
  espnEventId: string;
  sport: string;
  league: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  startTime: string;
  status: string;
  betComponentAddress: string | null;
  transactionId: string | null;
  resolveTransactionId: string | null;
  winnerTeam: string | null;
  oracleId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getOracleGames(params: {
  oracleId: string;
  status?: string;
  league?: string;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('oracleId', params.oracleId);
  if (params.status) searchParams.set('status', params.status);
  if (params.league) searchParams.set('league', params.league);
  searchParams.set('page', String(params.page || 1));
  searchParams.set('pageSize', String(params.pageSize || 20));
  return fetchApi<{ games: OracleGame[]; total: number; page: number; pageSize: number }>(
    `/admin/oracle/games?${searchParams}`
  );
}

export async function getOracleStats(oracleId: string) {
  return fetchApi<{
    total: number;
    discovered: number;
    active: number;
    resolved: number;
    failed: number;
  }>(`/admin/oracle/stats?oracleId=${oracleId}`);
}

export async function triggerOracleFetch(oracleId: string) {
  return fetchApi<{ message: string }>(`/admin/oracle/fetch-now?oracleId=${oracleId}`, {
    method: 'POST',
  });
}

// Team Images API
export interface TeamImage {
  id: string;
  teamName: string;
  sport: string;
  league: string;
  imageUrl: string;
  updatedAt: string;
}

export async function getTeamImages(params?: { sport?: string; league?: string; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.sport) searchParams.set('sport', params.sport);
  if (params?.league) searchParams.set('league', params.league);
  if (params?.search) searchParams.set('search', params.search);
  return fetchApi<TeamImage[]>(`/admin/team-images?${searchParams}`);
}

export async function updateTeamImage(id: string, imageUrl: string) {
  return fetchApi<TeamImage>(`/admin/team-images/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ imageUrl }),
  });
}

// Hookah API
export async function getHookahTriggers() {
  return fetchApi<any[]>('/admin/hookah/triggers');
}

export async function deleteAllHookahTriggers() {
  return fetchApi<{ deleted: number; total: number; errors?: Array<{ id: string; error: string }> }>('/admin/hookah/triggers', { method: 'DELETE' });
}

export async function deleteHookahTrigger(id: string) {
  return fetchApi<{ deleted: boolean }>(`/admin/hookah/triggers/${id}`, { method: 'DELETE' });
}
