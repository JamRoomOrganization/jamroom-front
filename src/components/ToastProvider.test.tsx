import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';

describe('ToastProvider', () => {
  it('renderiza children correctamente', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child Component</div>
      </ToastProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});