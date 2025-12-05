import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mockeamos RoomVisibilitySelector (misma carpeta => './RoomVisibilitySelector')
jest.mock("./RoomVisibilitySelector", () => ({
  RoomVisibilitySelector: ({ value, onChange }: any) => {
    // botón simple que muestra el valor actual y al hacer click lo alterna
    return (
      <button
        type="button"
        onClick={() => onChange(value === "public" ? "private" : "public")}
      >
        {value}
      </button>
    );
  },
}));

import { CreateRoomForm } from "./CreateRoomForm";

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("CreateRoomForm", () => {
  test("renderiza los campos básicos y el botón", () => {
    const onSubmit = jest.fn();
    render(<CreateRoomForm submitting={false} error={null} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText(/p. ej. Jam del viernes/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cuéntales a los demás de qué va esta sesión/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Pega aquí el trackId de Audius/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Crear sala/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeEnabled();
  });

  test("muestra error local si el nombre está vacío al submit", async () => {
    const onSubmit = jest.fn();
    render(<CreateRoomForm submitting={false} error={null} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole("button", { name: /Crear sala/i });
    fireEvent.click(submitBtn);

    // error local esperado
    await waitFor(() => {
      expect(screen.getByText("El nombre de la sala es obligatorio.")).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("al completar campos y cambiar visibilidad, onSubmit recibe los valores correctos", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<CreateRoomForm submitting={false} error={null} onSubmit={onSubmit} />);

    // completar nombre
    const nameInput = screen.getByPlaceholderText(/p. ej. Jam del viernes/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Mi sala de prueba" } });

    // descripción
    const descInput = screen.getByPlaceholderText(/Cuéntales a los demás de qué va esta sesión/i) as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: "Descripción corta" } });

    // initialTrackId
    const trackInput = screen.getByPlaceholderText(/Pega aquí el trackId de Audius/i) as HTMLInputElement;
    fireEvent.change(trackInput, { target: { value: "123-abc" } });

    // cambiar visibilidad usando el RoomVisibilitySelector mock (botón muestra "public" inicialmente)
    const visBtn = screen.getByRole("button", { name: "public" });
    fireEvent.click(visBtn); // ahora debería togglear a "private"

    // submit
    const submitBtn = screen.getByRole("button", { name: /Crear sala/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Mi sala de prueba",
        description: "Descripción corta",
        visibility: "private", // esperado tras toggle
        initialTrackId: "123-abc",
      });
    });
  });

  test("cuando submitting=true el botón está deshabilitado y muestra 'Creando sala…'", () => {
    const onSubmit = jest.fn();
    render(<CreateRoomForm submitting={true} error={null} onSubmit={onSubmit} />);

    // El botón cambia texto y muestra spinner (presencia del texto es suficiente)
    const submitBtn = screen.getByRole("button", { name: /Creando sala…/i });
    expect(submitBtn).toBeDisabled();

    // además vemos el texto "Creando sala…"
    expect(screen.getByText(/Creando sala…/i)).toBeInTheDocument();
  });

  test("muestra error externo cuando se le pasa la prop error", () => {
    const onSubmit = jest.fn();
    const externalError = "Error del servidor: no se pudo crear la sala.";
    render(<CreateRoomForm submitting={false} error={externalError} onSubmit={onSubmit} />);

    expect(screen.getByText(externalError)).toBeInTheDocument();
  });
});
