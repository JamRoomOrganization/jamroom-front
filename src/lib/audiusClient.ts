
const AUDIUS_API = 'https://api.audius.co';
const FALLBACK_DISCOVERY = 'https://discoveryprovider.audius.co/v1';
const APP_NAME = 'jamroom';

type DiscoveryResponse =
    | { data?: string[] }
    | { data?: { latest?: string[] } }
    | { services?: { discovery?: string[] } };


export type AudiusTrack = {
    id: string;
    title: string;
    permalink: string;
    artwork?: {
        '150x150'?: string;
        '480x480'?: string;
        '1000x1000'?: string;
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

// Cache para resultados de búsqueda (5 minutos de vida)
const searchCache = new Map<string, { data: AudiusTrack[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache para el nodo de descubrimiento recomendado por Audius
let cachedDiscovery: { url: string; timestamp: number } | null = null;
const DISCOVERY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos


/**
 * Limpia entradas expiradas del cache
 */
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
 * Usa https://api.audius.co y guarda el resultado en cache.
 */
async function getDiscoveryBase(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && cachedDiscovery && now - cachedDiscovery.timestamp < DISCOVERY_CACHE_DURATION) {
        return cachedDiscovery.url;
    }

    try {
        const res = await fetch(`${AUDIUS_API}/`);
        if (res.ok) {
            const body = (await res.json()) as DiscoveryResponse;

            const candidates =
                Array.isArray((body as { data?: string[] }).data)
                    ? (body as { data?: string[] }).data
                    : Array.isArray((body as { data?: { latest?: string[] } }).data?.latest)
                      ? (body as { data?: { latest?: string[] } }).data?.latest
                      : Array.isArray((body as { services?: { discovery?: string[] } }).services?.discovery)
                        ? (body as { services?: { discovery?: string[] } }).services?.discovery
                        : undefined;

            const firstUrl = candidates?.find((item) => typeof item === 'string' && item.startsWith('http'));
            if (firstUrl) {
                const normalized = `${firstUrl.replace(/\/$/, '')}/v1`;
                cachedDiscovery = { url: normalized, timestamp: now };
                return normalized;
            }
        }
    } catch (err) {
        console.error('[Audius] discovery lookup failed', err);
    }

    cachedDiscovery = { url: FALLBACK_DISCOVERY, timestamp: now };
    return FALLBACK_DISCOVERY;
}


/**
 * Busca tracks en Audius por texto libre con cache
 */
export async function searchAudiusTracks(
    query: string,
    useCache = true,
): Promise<AudiusTrack[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // Verificar cache
    const cacheKey = trimmed.toLowerCase();
    if (useCache) {
        cleanExpiredCache();
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('[Audius] Usando resultado desde cache para:', trimmed);
            return cached.data;
        }
    }
    const base = await getDiscoveryBase();
    const url = new URL(`${base}/tracks/search`);
    url.searchParams.set('query', trimmed);
    url.searchParams.set('limit', '10');
    url.searchParams.set('app_name', APP_NAME);

    let res: Response;
    try {
        res = await fetch(url.toString());
    } catch (err) {
        console.error('[Audius] network/search error', err);
        return [];
    }

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[Audius] search error', res.status, text);
        return [];
    }

    const body = (await res.json()) as AudiusSearchResponse;
    const results = body.data ?? [];

    // Guardar en cache
    if (useCache && results.length > 0) {
        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    }

    return results;
}

/**
 * Obtiene una URL de stream (MP3) estable para un track de Audius
 * usando no_redirect=true para evitar 302 en el navegador.
 * Incluye sistema de reintentos automáticos y múltiples estrategias.
 */
export async function getAudiusStreamUrl(
    trackId: string,
    maxRetries = 3,
): Promise<string | null> {
    const trimmed = trackId.trim();
    if (!trimmed) return null;

    console.log(`[Audius] Obteniendo stream URL para track: ${trimmed}`);

    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const base = await getDiscoveryBase(attempt > 0);
            const url = new URL(`${base}/tracks/${encodeURIComponent(trimmed)}/stream`);
            url.searchParams.set('app_name', APP_NAME);

            // Estrategia 1: Intentar obtener la URL con no_redirect
            url.searchParams.set('no_redirect', 'true');

            const res = await fetch(url.toString(), {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (res.ok) {
                const body = (await res.json()) as AudiusStreamResponse;
                console.log(`[Audius] stream response:`, body);

                // La API devuelve la URL directamente en 'data' como string
                if ('data' in body && typeof body.data === 'string' && body.data.length > 0) {
                    console.log(`[Audius] Stream URL obtenida exitosamente: ${body.data}`);
                    return body.data;
                }

                // Fallback: respuesta directa { url: "..." }
                if ('url' in body && typeof body.url === 'string' && body.url.length > 0) {
                    console.log(`[Audius] Stream URL obtenida (formato alternativo): ${body.url}`);
                    return body.url;
                }

                // Fallback: respuesta envuelta en data[0].url
                if ('data' in body && Array.isArray(body.data)) {
                    const firstUrl = body.data.find((item) => typeof item?.url === 'string')?.url;
                    if (firstUrl) {
                        console.log(`[Audius] Stream URL obtenida (array format): ${firstUrl}`);
                        return firstUrl;
                    }
                }
            }

            lastError = `HTTP ${res.status}`;
            console.warn(`[Audius] stream error (intento ${attempt + 1}/${maxRetries}): ${lastError}`);

        } catch (err) {
            lastError = err;
            console.warn(`[Audius] stream error (intento ${attempt + 1}/${maxRetries}):`, err);
        }

        // Esperar antes de reintentar (backoff exponencial)
        if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt)),
            );
        }
    }

    // Último fallback: retornar URL directa
    const base = await getDiscoveryBase();
    const finalFallback = `${base}/tracks/${encodeURIComponent(trimmed)}/stream?app_name=${APP_NAME}`;
    console.log('[Audius] Retornando URL de fallback final');
    return finalFallback;
}
