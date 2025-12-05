const AUDIUS_API = "https://api.audius.co";
const FALLBACK_DISCOVERY = "https://discoveryprovider.audius.co/v1";
const APP_NAME = "jamroom";

type DiscoveryResponse =
    | { data?: string[] }
    | { data?: { latest?: string[] } }
    | { services?: { discovery?: string[] } };

export type AudiusTrack = {
    id: string;
    title: string;
    permalink: string;
    artwork?: {
        "150x150"?: string;
        "480x480"?: string;
        "1000x1000"?: string;
    };
    user?: {
        id: string;
        handle: string;
        name: string;
    };
};

type AudiusSearchResponse = {
    data?: AudiusTrack[];
};

type AudiusStreamResponse =
    | { url?: string }
    | { data?: { url?: string }[] }
    | Record<string, unknown>;

// Cache para resultados de búsqueda (5 minutos)
const searchCache = new Map<
    string,
    { data: AudiusTrack[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000;

// Cache para discovery
let cachedDiscovery: { url: string; timestamp: number } | null = null;
const DISCOVERY_CACHE_DURATION = 10 * 60 * 1000;

function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            searchCache.delete(key);
        }
    }
}

/**
 * Obtiene el endpoint de discovery más reciente recomendado por Audius.
 */
async function getDiscoveryBase(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (
        !forceRefresh &&
        cachedDiscovery &&
        now - cachedDiscovery.timestamp < DISCOVERY_CACHE_DURATION
    ) {
        return cachedDiscovery.url;
    }

    try {
        const res = await fetch(`${AUDIUS_API}/`);
        if (res.ok) {
            const body = (await res.json()) as DiscoveryResponse;

            const candidates =
                Array.isArray((body as { data?: string[] }).data)
                    ? (body as { data?: string[] }).data
                    : Array.isArray(
                        (body as { data?: { latest?: string[] } }).data
                            ?.latest,
                    )
                        ? (body as { data?: { latest?: string[] } }).data?.latest
                        : Array.isArray(
                            (
                                body as {
                                    services?: { discovery?: string[] };
                                }
                            ).services?.discovery,
                        )
                            ? (
                                body as {
                                    services?: { discovery?: string[] };
                                }
                            ).services?.discovery
                            : undefined;

            const firstUrl = candidates?.find(
                (item) =>
                    typeof item === "string" && item.startsWith("http"),
            );
            if (firstUrl) {
                const normalized = `${firstUrl.replace(/\/$/, "")}/v1`;
                cachedDiscovery = { url: normalized, timestamp: now };
                return normalized;
            }
        }
    } catch (err) {
        console.error("[Audius] discovery lookup failed", err);
    }

    cachedDiscovery = { url: FALLBACK_DISCOVERY, timestamp: now };
    return FALLBACK_DISCOVERY;
}

/**
 * Busca tracks en Audius por texto libre con cache.
 */
export async function searchAudiusTracks(
    query: string,
    useCache = true,
): Promise<AudiusTrack[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = trimmed.toLowerCase();
    if (useCache) {
        cleanExpiredCache();
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(
                "[Audius] Usando resultado desde cache para:",
                trimmed,
            );
            return cached.data;
        }
    }

    const base = await getDiscoveryBase();
    const url = new URL(`${base}/tracks/search`);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("limit", "10");
    url.searchParams.set("app_name", APP_NAME);

    let res: Response;
    try {
        res = await fetch(url.toString());
    } catch (err) {
        console.error("[Audius] network/search error", err);
        return [];
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[Audius] search error", res.status, text);
        return [];
    }

    const body = (await res.json()) as AudiusSearchResponse;
    const results = body.data ?? [];

    if (useCache && results.length > 0) {
        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    }

    return results;
}

/**
 * Detecta si lo que recibimos ya es una URL directa hacia contenido de Audius
 * (ej. https://blockdaemon-audius-content-XX.bdnodes.net/...)
 */
function isAlreadyStreamUrl(idOrUrl: string): boolean {
    return (
        /^https?:\/\//i.test(idOrUrl) &&
        idOrUrl.includes("audius-content")
    );
}

/**
 * Obtiene una URL de stream (MP3) estable para un track de Audius.
 * Acepta:
 *  - ID lógico (ej: "4j0qa")
 *  - permalink/trackId oficial de Audius
 *  - O directamente una URL de audius-content (en cuyo caso la devuelve tal cual)
 */
export async function getAudiusStreamUrl(
    idOrUrl: string,
    maxRetries = 3,
): Promise<string | null> {
    const trimmed = idOrUrl.trim();
    if (!trimmed) return null;

    // Si ya es una URL directa de audius-content, no la tocamos
    if (isAlreadyStreamUrl(trimmed)) {
        console.log(
            "[Audius] getAudiusStreamUrl recibió URL directa, devolviendo sin cambios",
        );
        return trimmed;
    }

    console.log(
        `[Audius] Obteniendo stream URL para trackId/permalink: ${trimmed}`,
    );

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const base = await getDiscoveryBase(attempt > 0);
            const url = new URL(
                `${base}/tracks/${encodeURIComponent(trimmed)}/stream`,
            );
            url.searchParams.set("app_name", APP_NAME);
            // Intento principal: pedir JSON con no_redirect
            url.searchParams.set("no_redirect", "true");

            const res = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json",
                },
            });

            if (res.ok) {
                const body = (await res.json()) as AudiusStreamResponse;
                console.log("[Audius] stream response:", body);

                // Formato 1: { data: "https://..." }
                if (
                    "data" in body &&
                    typeof (body as any).data === "string" &&
                    (body as any).data.length > 0
                ) {
                    console.log(
                        "[Audius] Stream URL obtenida exitosamente (data string)",
                    );
                    return (body as any).data as string;
                }

                // Formato 2: { url: "https://..." }
                if (
                    "url" in body &&
                    typeof (body as any).url === "string" &&
                    (body as any).url.length > 0
                ) {
                    console.log(
                        "[Audius] Stream URL obtenida (campo url)",
                    );
                    return (body as any).url as string;
                }

                // Formato 3: { data: [{ url: "https://..." }, ...] }
                if ("data" in body && Array.isArray((body as any).data)) {
                    const firstUrl = (body as any).data.find(
                        (item: any) =>
                            item &&
                            typeof item.url === "string" &&
                            item.url.length > 0,
                    )?.url;
                    if (firstUrl) {
                        console.log(
                            "[Audius] Stream URL obtenida (array data[0].url):",
                            firstUrl,
                        );
                        return firstUrl;
                    }
                }
            }

            lastError = `HTTP ${res.status}`;
            console.warn(
                `[Audius] stream error (intento ${attempt + 1}/${maxRetries}): ${lastError}`,
            );
        } catch (err) {
            lastError = err;
            console.warn(
                `[Audius] stream error (intento ${attempt + 1}/${maxRetries}):`,
                err,
            );
        }

        if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt)),
            );
        }
    }

    // Fallback final: URL clásica con redirect
    const base = await getDiscoveryBase();
    const finalFallback = `${base}/tracks/${encodeURIComponent(
        trimmed,
    )}/stream?app_name=${APP_NAME}`;
    console.log("[Audius] Retornando URL de fallback final", {
        lastError,
        finalFallback,
    });

    return finalFallback;
}
