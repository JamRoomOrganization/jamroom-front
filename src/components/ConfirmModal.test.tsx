import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockTitle = 'Confirmar acción';
  const mockMessage = '¿Estás seguro de que quieres realizar esta acción?';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no se renderiza cuando isOpen es false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    expect(screen.queryByText(mockTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(mockMessage)).not.toBeInTheDocument();
  });

  it('se renderiza cuando isOpen es true', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockMessage)).toBeInTheDocument();
  });

  it('tiene atributos ARIA accesibles', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title');
  });

  it('llama a onClose cuando se hace clic en Cancelar', async () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('llama a onConfirm y onClose cuando se hace clic en Confirmar', async () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    await userEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('llama a onClose cuando se hace clic fuera del modal', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('no llama a onClose cuando se hace clic dentro del modal', async () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
      />
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(dialog);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('usa texto personalizado para los botones', () => {
    const customConfirmText = 'Aceptar';
    const customCancelText = 'Rechazar';

    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
        confirmText={customConfirmText}
        cancelText={customCancelText}
      />
    );

    expect(screen.getByText(customConfirmText)).toBeInTheDocument();
    expect(screen.getByText(customCancelText)).toBeInTheDocument();
  });

  it('muestra icono de peligro cuando type es "danger"', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
        type="danger"
      />
    );

    // Encuentra el icono buscando el contenedor con la clase específica
    const iconContainer = document.querySelector('.bg-red-500\\/20');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('bg-red-500/20');
  });

  it('muestra icono de advertencia cuando type es "warning"', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
        type="warning"
      />
    );

    // Encuentra el icono buscando el contenedor con la clase específica
    const iconContainer = document.querySelector('.bg-orange-500\\/20');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('bg-orange-500/20');
  });

  it('tiene clase de botón diferente según el tipo', () => {
    const { rerender } = render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
        type="danger"
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).toHaveClass('from-red-500');

    rerender(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title={mockTitle}
        message={mockMessage}
        type="warning"
      />
    );

    expect(confirmButton).toHaveClass('from-orange-500');
  });
}); 