/**
 * Utilidades para manejar URLs y metadatos de Audius
 */

/**
 * Obtiene la URL de streaming para un track de Audius
 * @param trackId - ID del track en Audius
 * @param userId - ID del usuario/artista en Audius (opcional)
 * @returns URL de streaming directa
 */
export const getAudiusStreamUrl = (trackId: string, userId?: string): string => {
  const streamUrl = process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL || 'https://creatornode.audius.co';

  // Si tenemos userId, usar el formato recomendado
  if (userId) {
    return `${streamUrl}/v1/tracks/${trackId}/stream?user_id=${userId}`;
  }

  // Si no tenemos userId, usar el formato básico
  return `${streamUrl}/v1/tracks/${trackId}/stream`;
};

/**
 * Obtiene la URL de streaming usando el discovery provider
 * Esta es una alternativa que puede funcionar mejor en algunos casos
 * @param trackId - ID del track en Audius
 * @returns URL de streaming directa
 */
export const getAudiusStreamUrlFromDiscovery = (trackId: string): string => {
  const apiUrl = process.env.NEXT_PUBLIC_AUDIUS_API_URL || 'https://discoveryprovider.audius.co';
  return `${apiUrl}/v1/tracks/${trackId}/stream`;
};

/**
 * Obtiene los metadatos de un track desde Audius
 * @param trackId - ID del track
 * @returns Promesa con los metadatos del track
 */
export const getAudiusTrackMetadata = async (trackId: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_AUDIUS_API_URL || 'https://discoveryprovider.audius.co';
  try {
    const response = await fetch(`${apiUrl}/v1/tracks/${trackId}`);
    if (!response.ok) {
      throw new Error(`Error al obtener metadatos: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Audius Utils] Error al obtener metadatos:', error);
    throw error;
  }
};

/**
 * Obtiene la URL de artwork/imagen de un track
 * @param artwork - Objeto de artwork de Audius
 * @param size - Tamaño preferido ('150x150', '480x480', '1000x1000')
 * @returns URL de la imagen o undefined
 */
export const getAudiusArtworkUrl = (
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  },
  size: '150x150' | '480x480' | '1000x1000' = '480x480'
): string | undefined => {
  if (!artwork) return undefined;

  // Intentar obtener el tamaño solicitado, o fallback a otros tamaños
  return artwork[size] || artwork['480x480'] || artwork['1000x1000'] || artwork['150x150'];
};

/**
 * Construye una URL de streaming con manejo de errores y fallbacks
 * @param trackId - ID del track
 * @param userId - ID del usuario (opcional)
 * @returns URL de streaming optimizada
 */
export const buildOptimizedStreamUrl = (trackId: string, userId?: string): string => {
  // Primero intentar con el creator node si tenemos userId
  if (userId) {
    return getAudiusStreamUrl(trackId, userId);
  }

  // Si no, usar el discovery provider
  return getAudiusStreamUrlFromDiscovery(trackId);
};

/**
 * Valida y sanitiza un track ID de Audius
 * @param trackId - ID del track a validar
 * @returns Track ID sanitizado o null si es inválido
 */
export const validateTrackId = (trackId: string): string | null => {
  const trimmed = trackId.trim();

  // IDs de Audius suelen ser alfanuméricos
  if (!trimmed || !/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

