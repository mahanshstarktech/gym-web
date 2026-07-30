// In a static Next.js export, NEXT_PUBLIC_ vars must be baked at build time.
// If the env var isn't set, we detect production vs dev at runtime.
function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    // On the live site, always use the production API
    return "https://lean-protocol-api.lsoni6870.workers.dev";
  }
  return "http://localhost:8787";
}

export const API_URL = getApiUrl();

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("lp_token") : null;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errData = await res.json();
      if (errData.error) msg = errData.error;
    } catch {}
    throw new Error(msg);
  }

  const json = await res.json();
  return json.data as T;
}
