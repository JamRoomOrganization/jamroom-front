import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InviteDialog from "./InviteDialog";

// Mock del clipboard
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("InviteDialog Component", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    roomId: "sala-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // No activamos fake timers aquí globalmente para evitar conflictos con waitFor
    // en tests que no lo necesitan.
  });

  it("no renderiza nada cuando open es false", () => {
    const { container } = render(<InviteDialog {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza correctamente cuando open es true", () => {
    render(<InviteDialog {...defaultProps} />);
    expect(screen.getByText("Invitar a la sala")).toBeInTheDocument();
    expect(screen.getByText(/Comparte este enlace/i)).toBeInTheDocument();
    
    const expectedUrl = "http://localhost/room/sala-123";
    expect(screen.getByDisplayValue(expectedUrl)).toBeInTheDocument();
  });

  it("llama a onOpenChange(false) al hacer clic en el botón X", () => {
    render(<InviteDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("✕"));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("llama a onOpenChange(false) al hacer clic en el botón Cerrar", () => {
    render(<InviteDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cerrar"));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("copia la URL y cambia el texto temporalmente (usando fake timers)", async () => {
    // Activamos fake timers SOLO para este test
    jest.useFakeTimers();
    
    render(<InviteDialog {...defaultProps} />);
    const copyButton = screen.getByText("Copiar");

    mockWriteText.mockResolvedValueOnce(undefined);

    // Click en copiar
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Verificamos estado inmediato
    expect(mockWriteText).toHaveBeenCalled();
    expect(screen.getByText("Copiado")).toBeInTheDocument();

    // Avanzamos el tiempo 2 segundos
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Verificamos que volvió al estado original
    expect(screen.getByText("Copiar")).toBeInTheDocument();

    // Limpieza: volver a timers reales para no afectar otros tests
    jest.useRealTimers();
  });

  it("reinicia el estado 'copied' cuando el modal se cierra y se vuelve a abrir", async () => {
    const { rerender } = render(<InviteDialog {...defaultProps} />);
    
    // 1. Forzamos estado copiado
    const copyButton = screen.getByText("Copiar");
    mockWriteText.mockResolvedValueOnce(undefined);
    
    await act(async () => {
      fireEvent.click(copyButton);
    });
    
    expect(screen.getByText("Copiado")).toBeInTheDocument();

    // 2. Cerramos el modal
    rerender(<InviteDialog {...defaultProps} open={false} />);
    
    // 3. Abrimos de nuevo
    rerender(<InviteDialog {...defaultProps} open={true} />);

    // Debería haberse reseteado a "Copiar"
    expect(screen.getByText("Copiar")).toBeInTheDocument();
  });
});