export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

console.log("[api] API_BASE_URL =", API_BASE_URL);

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

  try {
    console.log(`[API] ${options.method || "GET"} ${url}`);

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
      console.error(`[API] Error en ${options.method || "GET"} ${url}:`, {
        status: res.status,
        statusText: res.statusText,
        message,
        data,
      });
      throw new Error(message);
    }

    console.log(`[API] ✓ ${options.method || "GET"} ${url}`, data);
    return data as T;
  } catch (error) {
    // Mejorar el mensaje de error para debugging
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error(`[API] Failed to fetch ${url}`);
      console.error(`[API] Posibles causas:`);
      console.error(`  1. El servidor en ${API_BASE_URL} no está corriendo`);
      console.error(`  2. Problema de CORS`);
      console.error(`  3. No hay conexión de red`);
      throw new Error(`No se pudo conectar al servidor en ${API_BASE_URL}. Verifica que el backend esté corriendo.`);
    }
    throw error;
  }
}

export const api = {
  get: async <T>(path: string, auth = false) => {
    const result = await apiFetch<T>(path, { method: "GET", auth });
    return { data: result };
  },
  post: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "PUT", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = false) => apiFetch<T>(path, { method: "PATCH", body, auth }),
  delete: <T>(path: string, auth = false) => apiFetch<T>(path, { method: "DELETE", auth }),
};
