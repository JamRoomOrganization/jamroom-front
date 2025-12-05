import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinPrivateRoomDialog } from './JoinPrivateRoomDialog';

// Mock de next/router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('JoinPrivateRoomDialog', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no se renderiza cuando open es false', () => {
    render(
      <JoinPrivateRoomDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText('Unirse a una sala privada')).not.toBeInTheDocument();
  });

  it('se renderiza cuando open es true', () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Unirse a una sala privada')).toBeInTheDocument();
    expect(screen.getByText('Ingresa el código que te compartieron para unirte directamente a la sala.')).toBeInTheDocument();
  });

  it('llama a onOpenChange(false) cuando se hace clic en Cancelar', async () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    await userEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  // Eliminamos el test del botón "X" ya que no existe en el componente

  it('llama a onOpenChange(false) cuando se hace clic fuera del diálogo', () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // El backdrop es el div con onClick={handleBackdropClick}
    // Buscamos el contenedor principal que tiene el onClick
    const backdrop = screen.getByText('Unirse a una sala privada')
      .closest('div')?.parentElement;
    
    if (backdrop) {
      // Simulamos un clic en el backdrop
      fireEvent.click(backdrop);
    }

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('no llama a onOpenChange cuando se hace clic dentro del diálogo', async () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Haz clic en el input (dentro del diálogo)
    const input = screen.getByPlaceholderText('Ej: JAM-4F9Q, ROOM-123...');
    await userEvent.click(input);

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('limpia el campo después de cerrar y abrir de nuevo', async () => {
    const { rerender } = render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const input = screen.getByPlaceholderText('Ej: JAM-4F9Q, ROOM-123...');
    await userEvent.type(input, 'TEST-123');
    expect(input).toHaveValue('TEST-123');

    // Simular que el diálogo se cierra
    rerender(
      <JoinPrivateRoomDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Simular que el diálogo se abre de nuevo
    rerender(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const newInput = screen.getByPlaceholderText('Ej: JAM-4F9Q, ROOM-123...');
    expect(newInput).toHaveValue('');
  });

  it('muestra error si se envía el formulario con campo vacío', async () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const submitButton = screen.getByText('Ingresar');
    await userEvent.click(submitButton);

    expect(screen.getByText('Ingresa el código de la sala.')).toBeInTheDocument();
  });

  it('no muestra error inicialmente', () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText('Ingresa el código de la sala.')).not.toBeInTheDocument();
  });

  it('navega a /room/1 cuando se envía un código válido', async () => {
    render(
      <JoinPrivateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const input = screen.getByPlaceholderText('Ej: JAM-4F9Q, ROOM-123...');
    await userEvent.type(input, 'TEST-123');

    const submitButton = screen.getByText('Ingresar');
    await userEvent.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith('/room/1');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});