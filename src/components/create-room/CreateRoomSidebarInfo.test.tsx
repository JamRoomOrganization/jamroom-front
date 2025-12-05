import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateRoomSidebarInfo } from './CreateRoomSidebarInfo';

describe('CreateRoomSidebarInfo', () => {
  test('renderiza el título principal', () => {
    render(<CreateRoomSidebarInfo />);
    
    expect(screen.getByText('¿Qué es una sala?')).toBeInTheDocument();
  });

  test('renderiza la descripción principal', () => {
    render(<CreateRoomSidebarInfo />);
    
    const description = screen.getByText(/Una sala es un espacio sincronizado/i);
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-slate-400');
  });

  test('renderiza la lista de características', () => {
    render(<CreateRoomSidebarInfo />);
    
    // Verificar cada elemento de la lista
    expect(screen.getByText(/Puedes controlar la reproducción/i)).toBeInTheDocument();
    expect(screen.getByText(/Tus amigos verán el nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/Más adelante podrás añadir/i)).toBeInTheDocument();
  });

  test('muestra los puntos decorativos de la lista', () => {
    const { container } = render(<CreateRoomSidebarInfo />);
    
    // Verificar que hay 3 puntos decorativos
    const dots = container.querySelectorAll('.bg-purple-400');
    expect(dots).toHaveLength(3);
    
    dots.forEach(dot => {
      expect(dot).toHaveClass('w-1.5');
      expect(dot).toHaveClass('h-1.5');
      expect(dot).toHaveClass('rounded-full');
    });
  });

  test('tiene las clases de contenedor correctas', () => {
    const { container } = render(<CreateRoomSidebarInfo />);
    
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('bg-slate-900/60');
    expect(mainContainer).toHaveClass('border');
    expect(mainContainer).toHaveClass('border-slate-800');
    expect(mainContainer).toHaveClass('rounded-2xl');
    expect(mainContainer).toHaveClass('p-6');
    expect(mainContainer).toHaveClass('backdrop-blur-sm');
  });

  test('la lista tiene la estructura correcta', () => {
    render(<CreateRoomSidebarInfo />);
    
    // Verificar que hay una lista ul
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    
    // Verificar que cada item tiene la estructura correcta
    listItems.forEach(item => {
      expect(item).toHaveClass('flex');
      expect(item).toHaveClass('items-start');
      expect(item).toHaveClass('gap-2');
    });
  });
});