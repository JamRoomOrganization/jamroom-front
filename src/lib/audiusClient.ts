
const AUDIUS_BASE = 'https://discoveryprovider.audius.co/v1';

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

    const url = new URL(`${AUDIUS_BASE}/tracks/search`);
    url.searchParams.set('query', trimmed);
    url.searchParams.set('limit', '10');
    url.searchParams.set('app_name', 'jamroom');

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
 * Incluye sistema de reintentos automáticos.
 */
export async function getAudiusStreamUrl(
    trackId: string,
    maxRetries = 3,
): Promise<string | null> {
    const trimmed = trackId.trim();
    if (!trimmed) return null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const url = new URL(
                `${AUDIUS_BASE}/tracks/${encodeURIComponent(trimmed)}/stream`,
            );
            url.searchParams.set('app_name', 'jamroom');
            url.searchParams.set('no_redirect', 'true');

            const res = await fetch(url.toString(), {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                console.error(
                    `[Audius] stream error (intento ${attempt + 1}/${maxRetries})`,
                    res.status,
                    text,
                );

                // Si es el último intento, retornar null
                if (attempt === maxRetries - 1) {
                    return null;
                }

                // Esperar antes de reintentar (backoff exponencial)
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, attempt)),
                );
                continue;
            }

            const body = (await res.json()) as AudiusStreamResponse;

            // Intento 1: respuesta directa { url: "..." }
            if ('url' in body && typeof body.url === 'string' && body.url.length > 0) {
                console.log(`[Audius] Stream URL obtenida exitosamente en intento ${attempt + 1}`);
                return body.url;
            }

            // Intento 2: respuesta envuelta en data[0].url
            if ('data' in body && Array.isArray(body.data)) {
                const firstUrl = body.data.find((item) => typeof item?.url === 'string')?.url;
                if (firstUrl) {
                    console.log(`[Audius] Stream URL obtenida exitosamente en intento ${attempt + 1}`);
                    return firstUrl;
                }
            }

            console.error('[Audius] stream response without url', body);

            // Si no encontramos URL, intentar de nuevo
            if (attempt < maxRetries - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, attempt)),
                );
                continue;
            }

            return null;
        } catch (err) {
            console.error(
                `[Audius] network/stream error (intento ${attempt + 1}/${maxRetries})`,
                err,
            );

            // Si es el último intento, retornar null
            if (attempt === maxRetries - 1) {
                return null;
            }

            // Esperar antes de reintentar (backoff exponencial)
            await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt)),
            );
        }
    }

    return null;
}
