import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoomLoadingState } from './RoomLoadingState';

describe('RoomLoadingState', () => {
  it('renderiza el spinner y el texto correctamente', () => {
    render(<RoomLoadingState />);

    // Verificar que el texto está presente
    expect(screen.getByText('Cargando sala…')).toBeInTheDocument();
    expect(screen.getByText('Preparando tu experiencia musical')).toBeInTheDocument();

    // Verificar que hay elementos con animación de spinner
    // Buscamos elementos con la clase 'animate-spin' (hay dos en el componente)
    const spinnerElements = document.querySelectorAll('.animate-spin');
    expect(spinnerElements.length).toBeGreaterThan(0);
    
    // Verificar al menos un spinner tiene la clase correcta
    const hasSpinner = Array.from(spinnerElements).some(element => 
      element.classList.contains('animate-spin')
    );
    expect(hasSpinner).toBe(true);

    // Verificar que hay puntos animados
    const bounceElements = document.querySelectorAll('.animate-bounce');
    expect(bounceElements.length).toBe(3);

    // Verificar que hay un icono de música
    const musicIcon = document.querySelector('svg');
    expect(musicIcon).toBeInTheDocument();
  });

  it('tiene todas las clases de contenedor esperadas', () => {
    render(<RoomLoadingState />);

    // Verificar que el contenedor principal tiene las clases esperadas
    const container = screen.getByText('Cargando sala…').closest('.min-h-screen');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('bg-gradient-to-br');
    expect(container).toHaveClass('from-slate-950');
    expect(container).toHaveClass('via-purple-950');
    expect(container).toHaveClass('to-slate-950');
  });
});