// utils/audius.test.ts
import {
  getAudiusStreamUrl,
  getAudiusStreamUrlFromDiscovery,
  getAudiusTrackMetadata,
  getAudiusArtworkUrl,
  buildOptimizedStreamUrl,
  validateTrackId,
} from './audius';

// Mock de fetch global
global.fetch = jest.fn();

describe('Audius Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    // Restaurar process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAudiusStreamUrl', () => {
    test('devuelve URL con userId si está presente', () => {
      process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL = 'https://creatornode.audius.co';
      const trackId = 'track123';
      const userId = 'user456';

      const result = getAudiusStreamUrl(trackId, userId);

      expect(result).toBe('https://creatornode.audius.co/v1/tracks/track123/stream?user_id=user456');
    });

    test('devuelve URL sin userId si no se proporciona', () => {
      process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL = 'https://creatornode.audius.co';
      const trackId = 'track123';

      const result = getAudiusStreamUrl(trackId);

      expect(result).toBe('https://creatornode.audius.co/v1/tracks/track123/stream');
    });

    test('usa URL por defecto si NEXT_PUBLIC_AUDIUS_STREAM_URL no está definido', () => {
      delete process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL;
      const trackId = 'track123';

      const result = getAudiusStreamUrl(trackId);

      expect(result).toBe('https://creatornode.audius.co/v1/tracks/track123/stream');
    });
  });

  describe('getAudiusStreamUrlFromDiscovery', () => {
    test('devuelve URL de discovery provider', () => {
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';

      const result = getAudiusStreamUrlFromDiscovery(trackId);

      expect(result).toBe('https://discoveryprovider.audius.co/v1/tracks/track123/stream');
    });

    test('usa URL por defecto si NEXT_PUBLIC_AUDIUS_API_URL no está definido', () => {
      delete process.env.NEXT_PUBLIC_AUDIUS_API_URL;
      const trackId = 'track123';

      const result = getAudiusStreamUrlFromDiscovery(trackId);

      expect(result).toBe('https://discoveryprovider.audius.co/v1/tracks/track123/stream');
    });
  });

  describe('getAudiusTrackMetadata', () => {
    test('obtiene metadatos correctamente', async () => {
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';
      const mockMetadata = { data: { id: trackId, title: 'Test Track' } };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await getAudiusTrackMetadata(trackId);

      expect(fetch).toHaveBeenCalledWith(
        'https://discoveryprovider.audius.co/v1/tracks/track123'
      );
      expect(result).toEqual(mockMetadata);
    });

    test('lanza error cuando la respuesta no es ok', async () => {
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getAudiusTrackMetadata(trackId)).rejects.toThrow(
        'Error al obtener metadatos: 404'
      );
    });

    test('lanza error cuando fetch falla', async () => {
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';
      const networkError = new Error('Network error');

      (fetch as jest.Mock).mockRejectedValueOnce(networkError);

      await expect(getAudiusTrackMetadata(trackId)).rejects.toThrow(networkError);
    });

    test('registra error en console.error cuando falla', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';
      const networkError = new Error('Network error');

      (fetch as jest.Mock).mockRejectedValueOnce(networkError);

      await expect(getAudiusTrackMetadata(trackId)).rejects.toThrow(networkError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Audius Utils] Error al obtener metadatos:',
        networkError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAudiusArtworkUrl', () => {
    const artwork = {
      '150x150': 'https://example.com/150.jpg',
      '480x480': 'https://example.com/480.jpg',
      '1000x1000': 'https://example.com/1000.jpg',
    };

    test('devuelve el tamaño solicitado si está presente', () => {
      const result = getAudiusArtworkUrl(artwork, '150x150');
      expect(result).toBe('https://example.com/150.jpg');
    });

    test('devuelve tamaño por defecto (480x480) si no se especifica', () => {
      const result = getAudiusArtworkUrl(artwork);
      expect(result).toBe('https://example.com/480.jpg');
    });

    test('usa fallback a 1000x1000 si el tamaño solicitado (480x480) no está presente', () => {
      const incompleteArtwork = {
        '150x150': 'https://example.com/150.jpg',
        '1000x1000': 'https://example.com/1000.jpg',
      };

      const result = getAudiusArtworkUrl(incompleteArtwork, '480x480');
      // Según la función: artwork[size] || artwork['480x480'] || artwork['1000x1000'] || artwork['150x150']
      // size = '480x480' → no existe → artwork['480x480'] es undefined → artwork['1000x1000'] existe
      expect(result).toBe('https://example.com/1000.jpg');
    });

    test('usa fallback a 150x150 si ni 480x480 ni 1000x1000 están presentes', () => {
      const incompleteArtwork = {
        '150x150': 'https://example.com/150.jpg',
      };

      const result = getAudiusArtworkUrl(incompleteArtwork, '480x480');
      // size = '480x480' → no existe → artwork['480x480'] es undefined → artwork['1000x1000'] es undefined → artwork['150x150'] existe
      expect(result).toBe('https://example.com/150.jpg');
    });

    test('usa fallback a 1000x1000 si 480x480 no está presente (tamaño por defecto)', () => {
      const incompleteArtwork = {
        '150x150': 'https://example.com/150.jpg',
        '1000x1000': 'https://example.com/1000.jpg',
      };

      const result = getAudiusArtworkUrl(incompleteArtwork);
      // Por defecto es 480x480, pero no está, entonces fallback a 1000x1000 (antes que 150x150)
      expect(result).toBe('https://example.com/1000.jpg');
    });

    test('devuelve undefined si no hay artwork', () => {
      const result = getAudiusArtworkUrl(undefined);
      expect(result).toBeUndefined();
    });

    test('devuelve undefined si artwork está vacío', () => {
      const result = getAudiusArtworkUrl({});
      expect(result).toBeUndefined();
    });
  });

  describe('buildOptimizedStreamUrl', () => {
    test('usa getAudiusStreamUrl con userId si userId está presente', () => {
      process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL = 'https://creatornode.audius.co';
      const trackId = 'track123';
      const userId = 'user456';

      const result = buildOptimizedStreamUrl(trackId, userId);

      expect(result).toBe('https://creatornode.audius.co/v1/tracks/track123/stream?user_id=user456');
    });

    test('usa getAudiusStreamUrlFromDiscovery si userId no está presente', () => {
      process.env.NEXT_PUBLIC_AUDIUS_API_URL = 'https://discoveryprovider.audius.co';
      const trackId = 'track123';

      const result = buildOptimizedStreamUrl(trackId);

      expect(result).toBe('https://discoveryprovider.audius.co/v1/tracks/track123/stream');
    });

    test('usa URL por defecto cuando las variables de entorno no están definidas', () => {
      delete process.env.NEXT_PUBLIC_AUDIUS_STREAM_URL;
      delete process.env.NEXT_PUBLIC_AUDIUS_API_URL;
      
      const trackId = 'track123';
      const userId = 'user456';

      // Con userId
      const resultWithUserId = buildOptimizedStreamUrl(trackId, userId);
      expect(resultWithUserId).toBe('https://creatornode.audius.co/v1/tracks/track123/stream?user_id=user456');

      // Sin userId
      const resultWithoutUserId = buildOptimizedStreamUrl(trackId);
      expect(resultWithoutUserId).toBe('https://discoveryprovider.audius.co/v1/tracks/track123/stream');
    });
  });

  describe('validateTrackId', () => {
    test('devuelve trackId sanitizado si es válido', () => {
      const trackId = 'abc123';
      const result = validateTrackId(trackId);
      expect(result).toBe('abc123');
    });

    test('elimina espacios en blanco', () => {
      const trackId = '  abc123  ';
      const result = validateTrackId(trackId);
      expect(result).toBe('abc123');
    });

    test('devuelve null si el trackId está vacío después de trim', () => {
      const trackId = '   ';
      const result = validateTrackId(trackId);
      expect(result).toBeNull();
    });

    test('devuelve null si el trackId contiene caracteres no alfanuméricos', () => {
      const trackId = 'abc-123';
      const result = validateTrackId(trackId);
      expect(result).toBeNull();
    });

    test('devuelve null si el trackId contiene espacios internos', () => {
      const trackId = 'abc 123';
      const result = validateTrackId(trackId);
      expect(result).toBeNull();
    });

    test('devuelve null si el trackId es cadena vacía', () => {
      const trackId = '';
      const result = validateTrackId(trackId);
      expect(result).toBeNull();
    });

    test('acepta IDs con solo números', () => {
      const trackId = '123456';
      const result = validateTrackId(trackId);
      expect(result).toBe('123456');
    });

    test('acepta IDs con solo letras', () => {
      const trackId = 'abcdef';
      const result = validateTrackId(trackId);
      expect(result).toBe('abcdef');
    });
  });
});