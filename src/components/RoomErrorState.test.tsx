import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomErrorState } from './RoomErrorState';
import { AuthProvider } from '../context/AuthContext';

// Crea un wrapper personalizado con AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('RoomErrorState', () => {
  const mockError = 'Error de conexión';
  const mockRoomId = 'room-123';
  const mockSocketStatus = 'connected';
  const mockOnCreateRoom = jest.fn();
  const mockOnGoHome = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnReLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza error 404 correctamente', () => {
    renderWithAuth(
      <RoomErrorState
        error="404 Not Found"
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    expect(screen.getByText('Sala no encontrada')).toBeInTheDocument();
    expect(screen.getByText(`La sala "${mockRoomId}" no existe en el sistema.`)).toBeInTheDocument();
    expect(screen.getByText('Crear una sala nueva')).toBeInTheDocument();
    expect(screen.getByText('Ver salas disponibles')).toBeInTheDocument();
  });

  it('renderiza error de autenticación correctamente', () => {
    renderWithAuth(
      <RoomErrorState
        error="Authentication failed"
        roomId={mockRoomId}
        socketStatus="authError"
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    expect(screen.getByText('Sin permisos para controlar la sala')).toBeInTheDocument();
    expect(screen.getByText('Volver a iniciar sesión')).toBeInTheDocument();
  });

  it('llama a onCreateRoom cuando se hace clic en "Crear una sala nueva"', async () => {
    renderWithAuth(
      <RoomErrorState
        error="404 Not Found"
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    const createButton = screen.getByText('Crear una sala nueva');
    await userEvent.click(createButton);

    expect(mockOnCreateRoom).toHaveBeenCalled();
  });

  it('llama a onGoHome cuando se hace clic en "Ver salas disponibles"', async () => {
    renderWithAuth(
      <RoomErrorState
        error="404 Not Found"
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    const goHomeButton = screen.getByText('Ver salas disponibles');
    await userEvent.click(goHomeButton);

    expect(mockOnGoHome).toHaveBeenCalled();
  });

  it('llama a onRetry cuando se hace clic en "Reintentar"', async () => {
    renderWithAuth(
      <RoomErrorState
        error={mockError}
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    const retryButton = screen.getByText('Reintentar');
    await userEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('llama a onReLogin cuando se hace clic en "Volver a iniciar sesión"', async () => {
    renderWithAuth(
      <RoomErrorState
        error="Authentication failed"
        roomId={mockRoomId}
        socketStatus="authError"
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    const reLoginButton = screen.getByText('Volver a iniciar sesión');
    await userEvent.click(reLoginButton);

    expect(mockOnReLogin).toHaveBeenCalled();
  });

  it('muestra icono diferente para error 404', () => {
    renderWithAuth(
      <RoomErrorState
        error="404 Not Found"
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    // Busca el icono de forma más robusta
    const iconElement = screen.getByText('Sala no encontrada')
      .closest('div')?.parentElement?.querySelector('[class*="bg-yellow"]');
    
    expect(iconElement).toBeInTheDocument();
  });

  it('muestra lista de sugerencias para errores no-404', () => {
    renderWithAuth(
      <RoomErrorState
        error={mockError}
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    expect(screen.getByText('Asegúrate de que:')).toBeInTheDocument();
    expect(screen.getByText('• El backend esté corriendo')).toBeInTheDocument();
    expect(screen.getByText('• El sync-service esté accesible (WebSocket)')).toBeInTheDocument();
    expect(screen.getByText('• No haya problemas de red o CORS')).toBeInTheDocument();
  });

  it('no muestra sugerencias para error 404', () => {
    renderWithAuth(
      <RoomErrorState
        error="404 Not Found"
        roomId={mockRoomId}
        socketStatus={mockSocketStatus}
        onCreateRoom={mockOnCreateRoom}
        onGoHome={mockOnGoHome}
        onRetry={mockOnRetry}
        onReLogin={mockOnReLogin}
      />
    );

    expect(screen.queryByText('Asegúrate de que:')).not.toBeInTheDocument();
  });
});