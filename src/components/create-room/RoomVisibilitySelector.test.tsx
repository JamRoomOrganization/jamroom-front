import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoomVisibilitySelector } from './RoomVisibilitySelector';

// Mock del tipo Visibility
type Visibility = 'public' | 'link';

describe('RoomVisibilitySelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza ambos botones de visibilidad', () => {
    render(<RoomVisibilitySelector value="public" onChange={mockOnChange} />);

    // Verificar que ambos botones están presentes
    expect(screen.getByRole('button', { name: /pública/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /solo con enlace/i })).toBeInTheDocument();
  });

  test('muestra "Pública" seleccionada cuando value es "public"', () => {
    render(<RoomVisibilitySelector value="public" onChange={mockOnChange} />);

    const publicButton = screen.getByRole('button', { name: /pública/i });
    const linkButton = screen.getByRole('button', { name: /solo con enlace/i });

    // El botón público debe tener las clases de selección
    expect(publicButton).toHaveClass('border-purple-500');
    expect(publicButton).toHaveClass('bg-purple-500/10');
    expect(publicButton).toHaveClass('text-white');

    // El botón link NO debe tener las clases de selección
    expect(linkButton).not.toHaveClass('border-purple-500');
    expect(linkButton).not.toHaveClass('bg-purple-500/10');
    expect(linkButton).toHaveClass('text-slate-200');
  });

  test('muestra "Solo con enlace" seleccionada cuando value es "link"', () => {
    render(<RoomVisibilitySelector value="link" onChange={mockOnChange} />);

    const publicButton = screen.getByRole('button', { name: /pública/i });
    const linkButton = screen.getByRole('button', { name: /solo con enlace/i });

    // El botón link debe tener las clases de selección
    expect(linkButton).toHaveClass('border-purple-500');
    expect(linkButton).toHaveClass('bg-purple-500/10');
    expect(linkButton).toHaveClass('text-white');

    // El botón público NO debe tener las clases de selección
    expect(publicButton).not.toHaveClass('border-purple-500');
    expect(publicButton).not.toHaveClass('bg-purple-500/10');
    expect(publicButton).toHaveClass('text-slate-200');
  });

  test('llama a onChange con "link" cuando se hace clic en "Solo con enlace"', () => {
    render(<RoomVisibilitySelector value="public" onChange={mockOnChange} />);

    const linkButton = screen.getByRole('button', { name: /solo con enlace/i });
    fireEvent.click(linkButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('link');
  });

  test('llama a onChange con "public" cuando se hace clic en "Pública"', () => {
    render(<RoomVisibilitySelector value="link" onChange={mockOnChange} />);

    const publicButton = screen.getByRole('button', { name: /pública/i });
    fireEvent.click(publicButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('public');
  });

  test('muestra las descripciones correctas para cada opción', () => {
    render(<RoomVisibilitySelector value="public" onChange={mockOnChange} />);

    // Verificar descripciones
    expect(screen.getByText(/cualquiera dentro de jamroom puede encontrarla\./i)).toBeInTheDocument();
    expect(screen.getByText(/solo quienes tengan el link podrán entrar\./i)).toBeInTheDocument();
  });

  test('tiene todas las clases de contenedor', () => {
    const { container } = render(<RoomVisibilitySelector value="public" onChange={mockOnChange} />);

    // Verificar que el contenedor principal tiene las clases flex
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('flex');
    expect(mainDiv).toHaveClass('flex-col');
    expect(mainDiv).toHaveClass('sm:flex-row');
    expect(mainDiv).toHaveClass('gap-3');
  });
});