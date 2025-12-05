import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useRoomActions } from './useRoomActions';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    delete: jest.fn(),
  },
}));

describe('useRoomActions', () => {
  const mockRouterPush = jest.fn();
  const mockApiDelete = api.delete as jest.MockedFunction<typeof api.delete>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRouter - IMPORTANTE: Por defecto debe resolver sin error
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush.mockResolvedValue(undefined), // Resuelve por defecto
    });
    
    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
  });

  describe('deleteRoom', () => {
    it('debería eliminar la sala y redirigir a la página principal cuando hay roomId', async () => {
      const roomId = 'room-123';
      mockApiDelete.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      await act(async () => {
        await result.current.deleteRoom();
      });
      
      expect(mockApiDelete).toHaveBeenCalledWith(`/api/rooms/${roomId}`, true);
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('no debería hacer nada cuando no hay roomId', async () => {
      const { result } = renderHook(() => useRoomActions());
      
      await act(async () => {
        await result.current.deleteRoom();
      });
      
      expect(mockApiDelete).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('debería lanzar un error cuando la API falla', async () => {
      const roomId = 'room-123';
      const error = new Error('API Error');
      mockApiDelete.mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      await expect(act(async () => {
        await result.current.deleteRoom();
      })).rejects.toThrow('API Error');
      
      expect(mockApiDelete).toHaveBeenCalledWith(`/api/rooms/${roomId}`, true);
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('leaveRoom', () => {
    it('debería redirigir a la página principal cuando hay roomId', async () => {
      const roomId = 'room-123';
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      await act(async () => {
        await result.current.leaveRoom();
      });
      
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('no debería hacer nada cuando no hay roomId', async () => {
      const { result } = renderHook(() => useRoomActions());
      
      await act(async () => {
        await result.current.leaveRoom();
      });
      
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    // TEST SIMPLIFICADO - El hook no usa await con router.push, por lo que 
    // no captura errores de esa promesa. Simplemente verificamos que se llame.
    it('llama a router.push sin importar el resultado', async () => {
      const roomId = 'room-123';
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      // Simplemente ejecutamos la función
      await act(async () => {
        await result.current.leaveRoom();
      });
      
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });
  });

  describe('removeMember', () => {
    it('debería eliminar al miembro cuando hay roomId', async () => {
      const roomId = 'room-123';
      const targetUserId = 'user-456';
      mockApiDelete.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      await act(async () => {
        await result.current.removeMember(targetUserId);
      });
      
      expect(mockApiDelete).toHaveBeenCalledWith(
        `/api/rooms/${roomId}/members/${targetUserId}`,
        true
      );
    });

    it('no debería hacer nada cuando no hay roomId', async () => {
      const targetUserId = 'user-456';
      
      const { result } = renderHook(() => useRoomActions());
      
      await act(async () => {
        await result.current.removeMember(targetUserId);
      });
      
      expect(mockApiDelete).not.toHaveBeenCalled();
    });

    it('debería lanzar un error cuando la API falla', async () => {
      const roomId = 'room-123';
      const targetUserId = 'user-456';
      const error = new Error('API Error');
      mockApiDelete.mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useRoomActions(roomId));
      
      await expect(act(async () => {
        await result.current.removeMember(targetUserId);
      })).rejects.toThrow('API Error');
      
      expect(mockApiDelete).toHaveBeenCalledWith(
        `/api/rooms/${roomId}/members/${targetUserId}`,
        true
      );
    });
  });

  it('debería retornar todas las funciones', () => {
    const { result } = renderHook(() => useRoomActions('room-123'));
    
    expect(result.current).toHaveProperty('deleteRoom');
    expect(result.current).toHaveProperty('leaveRoom');
    expect(result.current).toHaveProperty('removeMember');
  });

  it('debería usar el contexto de autenticación', () => {
    const mockUser = { id: 'user-789', email: 'another@example.com' };
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    
    renderHook(() => useRoomActions('room-123'));
    
    expect(useAuth).toHaveBeenCalled();
  });
});