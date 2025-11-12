export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Si NEXT_PUBLIC_API_BASE_URL no está definida, usa string vacío
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Solo lanzar error en cliente en producción, no durante el build
if (typeof window !== "undefined" && process.env.NODE_ENV === "production" && !API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable must be set in production.");
}

type FetchOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  withCredentials?: boolean;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (options.auth) {
    const token = typeof window !== "undefined" ? localStorage.getItem("jr_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: options.withCredentials ? "include" : "omit",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : (null as unknown as T);

  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, auth = false) => apiFetch<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "PUT", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "PATCH", body, auth }),
  delete: <T>(path: string, auth = false) => apiFetch<T>(path, { method: "DELETE", auth }),
};
