import { fetchPublicRooms, apiFetch, api } from './api';

// Mock de fetch global con tipo correcto
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.MockedFunction<typeof global.fetch>;

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('API Functions', () => {
  const originalEnv = process.env;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    localStorageMock.getItem.mockClear();
    
    // Reset process.env
    process.env = { ...originalEnv };
    
    // Mock console.error para no llenar los logs
    console.error = jest.fn();
    
    // Configurar URL base por defecto
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
    process.env.NODE_ENV = 'test'; // Para evitar el error de producción
  });

  afterEach(() => {
    process.env = originalEnv;
    console.error = originalConsoleError;
  });

  describe('apiFetch', () => {
    test('hace fetch correctamente con método GET por defecto', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      } as Response);

      const result = await apiFetch('/test');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'omit',
      });
      expect(result).toEqual(mockResponse);
    });

    test('añade Authorization header cuando auth es true y hay token', async () => {
      localStorageMock.getItem.mockReturnValue('test-token-123');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/auth-test', { auth: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth-test', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123'
        },
        body: undefined,
        credentials: 'omit',
      });
    });

    test('no añade Authorization header cuando auth es true pero no hay token', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/auth-test', { auth: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth-test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'omit',
      });
      
      // Verificar que no existe la cabecera Authorization
      const call = mockFetch.mock.calls[0];
      const options = call[1] as RequestInit;
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    test('usa custom headers cuando se proporcionan', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/test', { headers: { 'X-Custom-Header': 'value' } });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Custom-Header': 'value'
        },
        body: undefined,
        credentials: 'omit',
      });
    });

    test('envía body cuando se proporciona', async () => {
      const body = { name: 'test', value: 123 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/test', { method: 'POST', body });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      });
    });

    test('maneja errores HTTP (response no ok)', async () => {
      const errorResponse = { message: 'Not found' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse,
      } as Response);

      await expect(apiFetch('/not-found')).rejects.toThrow('Not found');
    });

    test('maneja errores HTTP sin mensaje específico', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => null,
      } as Response);

      await expect(apiFetch('/error')).rejects.toThrow('HTTP 500');
    });

    test('maneja errores de red (Failed to fetch)', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiFetch('/test')).rejects.toThrow(
        'No se pudo conectar al servidor en http://localhost:3001. Verifica que el backend esté corriendo.'
      );
    });

    test('maneja respuestas no JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'plain text response',
      } as Response);

      const result = await apiFetch('/text');
      expect(result).toBeNull();
    });

    test('usa withCredentials cuando se especifica', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/test', { withCredentials: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'include',
      });
    });
  });

  describe('api object methods', () => {
    beforeEach(() => {
      // Configurar mock de fetch para respuestas estándar
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        } as Response)
      );
    });

    test('api.get llama a apiFetch con método GET', async () => {
      // No hay token, por lo que no debe incluir Authorization
      localStorageMock.getItem.mockReturnValue(null);
      const result = await api.get('/test', true);
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'omit',
      });
      expect(result).toEqual({ data: { success: true } });
    });

    test('api.get añade Authorization cuando hay token', async () => {
      const mockToken = 'test-token-123';
      localStorageMock.getItem.mockReturnValue(mockToken);
      
      await api.get('/test', true);
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: undefined,
        credentials: 'omit',
      });
    });

    test('api.post llama a apiFetch con método POST y body', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const body = { name: 'test' };

      const result = await api.post('/test', body, true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      });
      expect(result).toEqual({ success: true });
    });

    test('api.put llama a apiFetch con método PUT y body', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const body = { name: 'updated' };

      const result = await api.put('/test', body, true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      });
      expect(result).toEqual({ success: true });
    });

    test('api.patch llama a apiFetch con método PATCH y body', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const body = { field: 'value' };

      const result = await api.patch('/test', body, false);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      });
      expect(result).toEqual({ success: true });
    });

    test('api.delete llama a apiFetch con método DELETE', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const result = await api.delete('/test', true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'omit',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('fetchPublicRooms', () => {
    test('retorna array de salas cuando api.get retorna data array', async () => {
      const mockRooms = [{ id: '1', name: 'Room 1' }, { id: '2', name: 'Room 2' }];
      
      // Configurar mock de fetch para este test específico
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRooms,
      } as Response);

      const result = await fetchPublicRooms();
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/rooms/public', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'omit',
      });
      expect(result).toEqual(mockRooms);
    });

    test('retorna array de salas cuando api.get retorna array directamente', async () => {
      const mockRooms = [{ id: '1', name: 'Room 1' }];
      
      // Configurar mock de fetch para este test específico
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRooms,
      } as Response);

      const result = await fetchPublicRooms();
      expect(result).toEqual(mockRooms);
    });

    test('retorna array vacío cuando api.get retorna algo no array en data', async () => {
      // Configurar mock de fetch para este test específico
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: null }),
      } as Response);

      const result = await fetchPublicRooms();
      expect(result).toEqual([]);
    });

    test('retorna array vacío cuando api.get retorna algo no array', async () => {
      // Configurar mock de fetch para este test específico
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => 'not an array',
      } as Response);

      const result = await fetchPublicRooms();
      expect(result).toEqual([]);
    });

    test('lanza error cuando api.get falla', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchPublicRooms()).rejects.toThrow('Network error');
    });

    test('maneja console.error en catch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      await expect(fetchPublicRooms()).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('Error fetching public rooms:', expect.any(Error));
    });
  });

  describe('environment variable checks', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    test('usa NEXT_PUBLIC_API_BASE_URL cuando está definido', async () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
      
      // Re-importar el módulo para que use el nuevo valor de env
      const { apiFetch: apiFetchWithNewEnv } = require('./api');
      
      const localMockFetch = jest.fn();
      global.fetch = localMockFetch as jest.MockedFunction<typeof global.fetch>;
      
      localMockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetchWithNewEnv('/test');
      expect(localMockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.anything());
    });

    test('usa localhost:3001 por defecto cuando NEXT_PUBLIC_API_BASE_URL no está definido', async () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
      
      // Re-importar
      const { apiFetch: apiFetchWithNewEnv } = require('./api');
      
      const localMockFetch = jest.fn();
      global.fetch = localMockFetch as jest.MockedFunction<typeof global.fetch>;
      
      localMockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiFetchWithNewEnv('/test');
      expect(localMockFetch).toHaveBeenCalledWith('http://localhost:3001/test', expect.anything());
    });
  });
});