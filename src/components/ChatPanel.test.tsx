// src/components/__tests__/ChatPanel.test.tsx
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatPanel from "../components/ChatPanel";

// Mock del archivo de datos por defecto
jest.mock("../mocks/data", () => ({
  mockMessages: [
    { id: "mm1", user: "MockUser1", text: "Mock message 1", ts: "09:00" },
    { id: "mm2", user: "MockUser2", text: "Mock message 2", ts: "09:01" },
  ],
}));

describe("ChatPanel", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test("renderiza el header 'Chat' y los mensajes por defecto (mocked)", () => {
    render(<ChatPanel />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Mock message 1")).toBeInTheDocument();
    expect(screen.getByText("Mock message 2")).toBeInTheDocument();

    expect(screen.getByText("MockUser1")).toBeInTheDocument();
    expect(screen.getByText("09:01")).toBeInTheDocument();
  });

  test("si paso messages por prop, renderiza esos mensajes en vez del mock", () => {
    const custom = [
      { id: "c1", user: "Alice", text: "Hello world", ts: "10:00" },
      { id: "c2", user: "Bob", text: "Hi Alice", ts: "10:01" },
    ];
    render(<ChatPanel messages={custom} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Hi Alice")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Mock message 1")).not.toBeInTheDocument();
  });

  test("input permite escribir y el botón 'Enviar' está deshabilitado si draft vacío", () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText("Escribe un mensaje…") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /Enviar/i }) as HTMLButtonElement;

    expect(input.value).toBe("");
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "hola" } });
    expect(input.value).toBe("hola");
    expect(button).toBeEnabled();
  });

  test("al hacer click en 'Enviar' el draft se limpia (send())", async () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText("Escribe un mensaje…") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /Enviar/i }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: "mensaje de prueba" } });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(input.value).toBe("");
      expect(button).toBeDisabled();
    });
  });

  test("presionar Enter cuando hay draft también dispara send() y limpia el input", async () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText("Escribe un mensaje…") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "otra prueba" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  test("el efecto de scroll coloca scrollTop = scrollHeight cuando cambian los mensajes", async () => {
    // render con un mensaje inicial
    const initial = [{ id: "a1", user: "U1", text: "first", ts: "00:01" }];
    const { rerender, container } = render(<ChatPanel messages={initial} />);

    // Localiza el contenedor que actúa como listRef.
    // En el componente es el div con overflow-auto; buscamos por parte de la clase.
    const listDiv = container.querySelector('[class*="overflow-auto"]') as HTMLElement | null;

    expect(listDiv).toBeTruthy();

    // jsdom no calcula layout: forzamos un scrollHeight grande en el elemento que realmente usa el ref
    Object.defineProperty(listDiv!, "scrollHeight", { value: 700, configurable: true });

    // ahora rerender con nuevos mensajes (esto disparará el useEffect que asigna scrollTop)
    const newMessages = [
      ...initial,
      { id: "a2", user: "U2", text: "second", ts: "00:02" },
      { id: "a3", user: "U3", text: "third", ts: "00:03" },
    ];
    rerender(<ChatPanel messages={newMessages} />);

    // espera a que el efecto se ejecute y verifique scrollTop
    await waitFor(() => {
      expect(listDiv!.scrollTop).toBe(700);
    });
  });
});
