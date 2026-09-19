export type ApiService = ReturnType<typeof apiServiceFactory>;

export const apiServiceFactory = ({ fetchFn }: { fetchFn: typeof fetch }) => ({
  get: <T>(path: string, params?: Record<string, string | undefined>): Promise<T> => {
    const query = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          query.set(key, value);
        }
      }
    }
    const qs = query.toString();
    return fetchFn(qs ? `${path}?${qs}` : path).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    });
  },

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetchFn(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    })
});
