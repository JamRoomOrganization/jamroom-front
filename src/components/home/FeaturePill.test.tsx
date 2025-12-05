import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeaturePill } from './FeaturePill';

describe('FeaturePill', () => {
  const mockProps = {
    title: 'Sincronización en tiempo real',
    body: 'Todos los participantes escuchan la misma canción al mismo tiempo',
  };

  test('renderiza el título y cuerpo correctamente', () => {
    render(<FeaturePill {...mockProps} />);

    expect(screen.getByText('Sincronización en tiempo real')).toBeInTheDocument();
    expect(screen.getByText('Todos los participantes escuchan la misma canción al mismo tiempo')).toBeInTheDocument();
  });

  test('muestra el icono de música', () => {
    render(<FeaturePill {...mockProps} />);

    const icon = screen.getByText('♪');
    expect(icon).toBeInTheDocument();
  });

  test('aplica las clases CSS correctas', () => {
    const { container } = render(<FeaturePill {...mockProps} />);

    const pill = container.firstChild;
    expect(pill).toHaveClass('flex');
    expect(pill).toHaveClass('gap-3');
    expect(pill).toHaveClass('bg-slate-900/60');
    expect(pill).toHaveClass('border');
    expect(pill).toHaveClass('border-slate-800/70');
    expect(pill).toHaveClass('rounded-2xl');
    expect(pill).toHaveClass('px-4');
    expect(pill).toHaveClass('py-3');
  });

  test('renderiza con diferentes props', () => {
    const customProps = {
      title: 'Cola compartida',
      body: 'Cualquiera puede añadir canciones a la cola',
    };

    render(<FeaturePill {...customProps} />);

    expect(screen.getByText('Cola compartida')).toBeInTheDocument();
    expect(screen.getByText('Cualquiera puede añadir canciones a la cola')).toBeInTheDocument();
  });
});