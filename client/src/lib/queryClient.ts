import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// In-memory session token. We intentionally do NOT use localStorage/sessionStorage/cookies
// (blocked in the sandboxed preview iframe). The token lives for the lifetime of the page.
let sessionToken: string | null = null;
const tokenListeners = new Set<(t: string | null) => void>();

export function setSessionToken(token: string | null) {
  sessionToken = token;
  tokenListeners.forEach((cb) => cb(token));
}
export function getSessionToken(): string | null {
  return sessionToken;
}
export function subscribeToken(cb: (t: string | null) => void): () => void {
  tokenListeners.add(cb);
  return () => tokenListeners.delete(cb);
}

function authHeaders(): Record<string, string> {
  return sessionToken ? { "x-session-token": sessionToken } : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let payload: any = null;
    const text = await res.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
    const err: any = new Error(payload?.message || res.statusText || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = payload;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (data !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders() });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
