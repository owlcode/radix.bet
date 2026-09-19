export const httpFactory = ({ fetchFn }: { fetchFn: typeof fetch } = { fetchFn: fetch }) => {
  return {
    get: <T = unknown>(url: string) =>
      fetchFn(url, { method: 'GET' }).then((res) => res.json() as T),
    post: <T = unknown>(url: string, body: unknown) =>
      fetchFn(url, { method: 'POST', body: JSON.stringify(body) }).then((res) => res.json() as T)
  };
};

export const http = httpFactory();
