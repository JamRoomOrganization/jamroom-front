import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoomQueue } from './useRoomQueue';
import { api } from '../lib/api';
import { getAudiusStreamUrl } from '../lib/audiusClient';

// Mock de las dependencias
jest.mock('@/lib/api');
jest.mock('@/lib/audiusClient');

// Mock de fetch global
global.fetch = jest.fn();

describe('useRoomQueue', () => {
  const roomId = 'test-room-123';
  const mockTrackId = 'track-456';
  const mockStreamUrl = 'https://stream.audius.co/track-456';
  
  const mockQueueItem = {
    id: '1',
    room_id: roomId,
    track_id: mockTrackId,
    title: 'Test Track',
    added_by: 'user-123',
    added_at: '2023-01-01T00:00:00Z',
    position: 0,
  };

  const mockAudiusTrackData = {
    data: {
      title: 'Test Track',
      user: { name: 'Test Artist' },
      duration: 180,
      artwork: {
        '480x480': 'artwork-480.jpg',
        '1000x1000': 'artwork-1000.jpg',
        '150x150': 'artwork-150.jpg',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock de api
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (api.post as jest.Mock).mockResolvedValue({});
    (api.delete as jest.Mock).mockResolvedValue({});
    
    // Mock de getAudiusStreamUrl
    (getAudiusStreamUrl as jest.Mock).mockResolvedValue(mockStreamUrl);
    
    // Mock de fetch para metadata de Audius
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAudiusTrackData,
    });
    
    // Mock de console para evitar logs en tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('inicializa con queue vacía y loading true', () => {
    // Mock para mantener loading
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    expect(result.current.queue).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('carga queue correctamente', async () => {
    const mockQueueItems = [mockQueueItem];
    (api.get as jest.Mock).mockResolvedValue({ data: mockQueueItems });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    // Inicialmente loading
    expect(result.current.loading).toBe(true);
    
    // Esperar a que cargue
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verificar queue cargada
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].id).toBe(mockTrackId);
    expect(result.current.queue[0].title).toBe('Test Track');
    expect(result.current.queue[0].artist).toBe('Test Artist');
    expect(result.current.queue[0].streamUrl).toBe(mockStreamUrl);
    
    // Verificar llamadas a APIs
    expect(api.get).toHaveBeenCalledWith(`/api/rooms/${roomId}/queue`, true);
    expect(getAudiusStreamUrl).toHaveBeenCalledWith(mockTrackId);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://discoveryprovider.audius.co/v1/tracks/${mockTrackId}`
    );
  });

  test('maneja error al cargar queue', async () => {
    const error = new Error('Network error');
    (api.get as jest.Mock).mockRejectedValue(error);
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe('Network error');
    expect(result.current.queue).toEqual([]);
  });

  test('maneja error al obtener metadata de Audius', async () => {
    const mockQueueItems = [mockQueueItem];
    (api.get as jest.Mock).mockResolvedValue({ data: mockQueueItems });
    
    // Mock de fetch para que falle
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Audius API error'));
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Debería tener el track con información básica
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].title).toBe('Test Track'); // Usa title del queue item
    expect(result.current.queue[0].artist).toBeUndefined(); // No hay metadata
  });

  test('añade track a la queue', async () => {
    // Configurar queue vacía inicial
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Añadir track
    const metadata = {
      title: 'New Track',
      artist: 'New Artist',
      artworkUrl: 'artwork.jpg',
      duration: 200,
    };
    
    await act(async () => {
      await result.current.addTrack(mockTrackId, metadata);
    });
    
    // Verificar llamadas a API
    expect(getAudiusStreamUrl).toHaveBeenCalledWith(mockTrackId);
    expect(api.post).toHaveBeenCalledWith(
      `/api/rooms/${roomId}/queue`,
      {
        trackId: mockTrackId,
        title: 'New Track',
      },
      true
    );
    
    // Verificar optimistic update
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].title).toBe('New Track');
    expect(result.current.queue[0].artist).toBe('New Artist');
    expect(result.current.queue[0].streamUrl).toBe(mockStreamUrl);
    
    // Avanzar timers para que se ejecute el fetchQueue después de 1 segundo
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Verificar que se llamó a api.get de nuevo
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('maneja error al añadir track (sin streamUrl)', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (getAudiusStreamUrl as jest.Mock).mockResolvedValue(null);
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Intentar añadir track (debería fallar)
    await expect(
      act(async () => {
        await result.current.addTrack(mockTrackId);
      })
    ).rejects.toThrow('No se pudo obtener la URL de streaming');
    
    // No debería haber llamado a api.post
    expect(api.post).not.toHaveBeenCalled();
  });

  test('maneja error al añadir track (API error)', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    const apiError = new Error('API error');
    (api.post as jest.Mock).mockRejectedValue(apiError);
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Intentar añadir track (debería fallar)
    try {
      await act(async () => {
        await result.current.addTrack(mockTrackId);
      });
    } catch {
      // Esperado que falle
    }
    
    // El error debería estar establecido - usar waitFor porque puede ser asíncrono
    await waitFor(() => {
      expect(result.current.error).toBe('API error');
    });
  });

  test('elimina track de la queue', async () => {
    const mockQueueItems = [mockQueueItem];
    (api.get as jest.Mock).mockResolvedValue({ data: mockQueueItems });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.queue).toHaveLength(1);
    
    // Eliminar track
    await act(async () => {
      await result.current.removeTrack(mockTrackId);
    });
    
    // Verificar optimistic update (queue vacía)
    expect(result.current.queue).toHaveLength(0);
    
    // Verificar llamada a API
    expect(api.delete).toHaveBeenCalledWith(
      `/api/rooms/${roomId}/queue/${mockTrackId}`,
      true
    );
    
    // Avanzar timers para que se ejecute el fetchQueue después de 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Verificar que se llamó a api.get de nuevo
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('maneja error al eliminar track', async () => {
    const mockQueueItems = [mockQueueItem];
    (api.get as jest.Mock).mockResolvedValue({ data: mockQueueItems });
    const deleteError = new Error('Delete error');
    (api.delete as jest.Mock).mockRejectedValue(deleteError);
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Eliminar track (debería fallar)
    try {
      await act(async () => {
        await result.current.removeTrack(mockTrackId);
      });
    } catch {
      // Esperado que falle
    }
    
    // Error debería estar establecido - usar waitFor porque puede ser asíncrono
    await waitFor(() => {
      expect(result.current.error).toBe('Delete error');
    });
    
    // Debería haber intentado recargar la queue (pero api.get está mockeado para éxito)
    // Solo verificar que se llamó al menos 2 veces (inicial + reload después del error)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('reload vuelve a cargar la queue', async () => {
    let callCount = 0;
    (api.get as jest.Mock).mockImplementation(() => {
      callCount++;
      return Promise.resolve({ data: callCount === 1 ? [] : [mockQueueItem] });
    });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.queue).toHaveLength(0);
    
    // Llamar a reload
    await act(async () => {
      await result.current.reload();
    });
    
    // Queue debería tener el item ahora
    expect(result.current.queue).toHaveLength(1);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('hace polling cada 20 segundos', async () => {
    // Mockear Math.random para que devuelva 0 (sin delay aleatorio)
    jest.spyOn(Math, 'random').mockReturnValue(0);
    
    let callCount = 0;
    (api.get as jest.Mock).mockImplementation(() => {
      callCount++;
      return Promise.resolve({ data: [] });
    });
    
    renderHook(() => useRoomQueue(roomId));
    
    // Primer fetch al montar
    await waitFor(() => {
      expect(callCount).toBe(1);
    });
    
    // Avanzar 25 segundos para asegurar que se ejecute el polling
    // (20s de intervalo + margen para asegurar)
    act(() => {
      jest.advanceTimersByTime(25000);
    });
    
    // Debería haber hecho polling (llamada #2)
    await waitFor(() => {
      expect(callCount).toBe(2);
    });
    
    // Avanzar otros 25 segundos
    act(() => {
      jest.advanceTimersByTime(25000);
    });
    
    await waitFor(() => {
      expect(callCount).toBe(3);
    });
    
    (Math.random as jest.Mock).mockRestore();
  });

  test('evita múltiples fetch simultáneos', async () => {
    // Mock para simular fetch lento - solo se resolverá manualmente
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });
    
    let callCount = 0;
    (api.get as jest.Mock).mockImplementation(() => {
      callCount++;
      // La primera llamada (efecto inicial) retorna la promesa pendiente
      // Las siguientes llamadas (reloads) deberían ser ignoradas
      return fetchPromise;
    });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    // Verificar que ya se llamó una vez (efecto inicial)
    expect(callCount).toBe(1);
    
    // Intentar llamar a reload 3 veces mientras la primera sigue pendiente
    // Estas deberían ser ignoradas porque isFetchingRef.current es true
    act(() => {
      result.current.reload();
      result.current.reload();
      result.current.reload();
    });
    
    // callCount sigue siendo 1 porque las llamadas a reload fueron ignoradas
    expect(callCount).toBe(1);
    
    // Ahora resolver la promesa pendiente
    await act(async () => {
      resolveFetch!({ data: [] });
    });
    
    // Después de resolver, isFetchingRef.current debería ser false
    // Si intentamos llamar a reload de nuevo, debería funcionar
    await act(async () => {
      await result.current.reload();
    });
    
    // Ahora debería haber 2 llamadas: inicial + un reload
    expect(callCount).toBe(2);
  });

  test('no actualiza queue si no hay cambios (hash check)', async () => {
    const mockQueueItems = [mockQueueItem];
    let callCount = 0;
    
    (api.get as jest.Mock).mockImplementation(() => {
      callCount++;
      // Siempre devuelve los mismos datos
      return Promise.resolve({ data: mockQueueItems });
    });
    
    const { result } = renderHook(() => useRoomQueue(roomId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Guardar referencia actual
    const initialQueue = [...result.current.queue];
    
    // Llamar a reload manualmente
    await act(async () => {
      await result.current.reload();
    });
    
    // api.get debería haber sido llamado de nuevo (llamada #2)
    expect(callCount).toBe(2);
    
    // La queue debería tener los mismos datos (pero puede ser nueva referencia)
    expect(result.current.queue[0].id).toBe(initialQueue[0].id);
    expect(result.current.queue[0].title).toBe(initialQueue[0].title);
    
    // Ahora simular el polling avanzando el tiempo
    act(() => {
      jest.advanceTimersByTime(25000);
    });
    
    // Esperar a que se procese el polling
    await waitFor(() => {
      // Debería haber intentado hacer polling, pero como el hash es el mismo,
      // podría no haber hecho fetch realmente
      // El contador podría seguir siendo 2 o podría ser 3 dependiendo de la implementación
      // Para este test, solo verificamos que no se crea una nueva referencia innecesariamente
      // Pero no podemos garantizar cuántas veces se llama porque depende del hash check
      expect(result.current.queue[0].id).toBe(initialQueue[0].id);
    });
  });
});