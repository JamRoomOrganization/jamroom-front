import { renderHook } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  it('debe lanzar un error si se usa fuera del provider', () => {
    // Suprimir el error de consola
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast debe usarse dentro de ToastProvider');

    consoleErrorSpy.mockRestore();
  });
});