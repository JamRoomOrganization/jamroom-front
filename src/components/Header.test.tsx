import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import Header from "./Header";

// Mock de AuthContext
const mockUseAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderHeader() {
  return render(<Header />);
}

describe("Header", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockSignOut.mockReset();
  });

  it("muestra el nombre de la app y el botón de crear sala", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: mockSignOut,
    });

    renderHeader();

    expect(screen.getByText("JamRoom")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /crear sala/i })
    ).toBeInTheDocument();
  });

  it("muestra el saludo con el nombre del usuario cuando está logueado", () => {
    mockUseAuth.mockReturnValue({
      user: { name: "Usuario de prueba", email: "test@example.com" },
      loading: false,
      signOut: mockSignOut,
    });

    renderHeader();

    expect(
      screen.getByText(/hola, usuario de prueba/i)
    ).toBeInTheDocument();
  });

  it('dispara signOut cuando se pulsa en "Salir"', () => {
    mockUseAuth.mockReturnValue({
      user: { name: "Usuario de prueba", email: "test@example.com" },
      loading: false,
      signOut: mockSignOut,
    });

    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /salir/i }));

    expect(mockSignOut).toHaveBeenCalled();
  });
});

