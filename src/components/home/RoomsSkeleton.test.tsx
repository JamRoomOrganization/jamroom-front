import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoomsSkeleton } from './RoomsSkeleton';

describe('RoomsSkeleton', () => {
  test('renderiza el grid de skeleton correctamente', () => {
    render(<RoomsSkeleton />);

    // Verificar que hay 4 elementos skeleton
    const skeletonItems = document.querySelectorAll('.animate-pulse');
    expect(skeletonItems.length).toBe(4);
  });

  test('tiene la estructura de grid correcta', () => {
    const { container } = render(<RoomsSkeleton />);

    const grid = container.firstChild;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
    expect(grid).toHaveClass('xl:grid-cols-4');
    expect(grid).toHaveClass('gap-6');
  });

  test('cada skeleton item tiene las clases correctas', () => {
    render(<RoomsSkeleton />);

    // Verificar que cada elemento tiene la clase animate-pulse
    const skeletonItems = document.querySelectorAll('.animate-pulse');
    skeletonItems.forEach(item => {
      expect(item).toHaveClass('bg-slate-800/50');
      expect(item).toHaveClass('rounded-2xl');
      expect(item).toHaveClass('p-6');
      expect(item).toHaveClass('border');
      expect(item).toHaveClass('border-slate-700/50');
    });
  });

  test('contiene elementos de placeholder para cada parte', () => {
    render(<RoomsSkeleton />);

    // Verificar que hay elementos de placeholder
    const placeholderElements = document.querySelectorAll('.bg-slate-700');
    expect(placeholderElements.length).toBeGreaterThan(0);

    // Verificar elementos circulares (avatars)
    const circularPlaceholders = document.querySelectorAll('.rounded-full.bg-slate-700');
    expect(circularPlaceholders.length).toBeGreaterThanOrEqual(12); // 3 avatars × 4 items
  });

  test('renderiza elementos skeleton con animación', () => {
    render(<RoomsSkeleton />);

    // Verificar que los elementos tienen la animación
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBe(4);
  });
});