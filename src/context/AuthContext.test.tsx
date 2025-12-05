import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './AuthContext';

describe('AuthContext', () => {
  // Mock de localStorage
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('renderiza children correctamente', () => {
    render(
      <AuthProvider>
        <div data-testid="child">Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});