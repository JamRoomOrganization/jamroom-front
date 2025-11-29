import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "@/components/Header";

// Mock del contexto de autenticación
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Test User", email: "test@example.com" },
    loading: false,
    signOut: jest.fn(),
  }),
}));

// Mock de next/link para tests
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("Header", () => {
  it("muestra el nombre de la app y el botón de crear sala", () => {
    render(<Header />);

    // Nombre de la app
    expect(screen.getByText("JamRoom")).toBeInTheDocument();

    // Botón crear sala
    expect(screen.getByText("Crear sala")).toBeInTheDocument();
  });

  it("muestra el saludo con el nombre del usuario cuando está logueado", () => {
    render(<Header />);

    expect(screen.getByText(/Hola, Test User/i)).toBeInTheDocument();
  });

  it("dispara signOut cuando se pulsa en 'Salir'", () => {
    const signOutMock = jest.fn();

    // Sobrescribimos temporalmente el mock para este test
    (jest.mocked as any)(require("@/context/AuthContext")).useAuth = () => ({
      user: { name: "Test User", email: "test@example.com" },
      loading: false,
      signOut: signOutMock,
    });

    render(<Header />);

    const salirButton = screen.getByText("Salir");
    fireEvent.click(salirButton);

    expect(signOutMock).toHaveBeenCalled();
  });
});
