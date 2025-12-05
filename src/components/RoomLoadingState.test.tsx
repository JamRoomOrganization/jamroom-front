import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoomLoadingState } from './RoomLoadingState';

describe('RoomLoadingState', () => {
  it('renderiza el spinner y el texto correctamente', () => {
    render(<RoomLoadingState />);

    // Verificar que el texto está presente
    expect(screen.getByText('Cargando sala…')).toBeInTheDocument();

    // Verificar que hay un elemento con animación de spinner
    const spinner = screen.getByText('Cargando sala…').previousSibling;
    expect(spinner).toHaveClass('animate-spin');
  });
});