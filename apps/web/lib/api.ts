export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    credentials: "include", // For cookies
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
