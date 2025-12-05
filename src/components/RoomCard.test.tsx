import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import RoomCard from "../components/RoomCard";

// Mocks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

describe("RoomCard", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    // reset mocks
    mockPush.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  const baseRoom = {
    id: "room-1",
    name: "Sala de prueba",
    description: "Descripción de prueba",
    member_count: 5,
    current_track_count: 2,
    host: { displayName: "HostPrueba" },
  };

  test("renderiza nombre, descripción, creador y tracks", () => {
    render(<RoomCard room={baseRoom as any} />);

    expect(screen.getByText("Sala de prueba")).toBeInTheDocument();
    expect(screen.getByText("Descripción de prueba")).toBeInTheDocument();
    expect(screen.getByText(/Creada por:/)).toHaveTextContent("Creada por: HostPrueba");
    expect(screen.getByText(/2 tracks/)).toBeInTheDocument();
    // participant count badge top-right
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
  });

  test("muestra nombre de anfitrión 'Anónimo' cuando no hay host", () => {
    const room = { ...baseRoom, host: undefined };
    render(<RoomCard room={room as any} />);

    expect(screen.getByText("Creada por: Anónimo")).toBeInTheDocument();
  });

  test("cuando authLoading es true, el botón está deshabilitado y muestra 'Cargando...'", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<RoomCard room={baseRoom as any} />);

    const btn = screen.getByRole("button", { name: /Cargando.../i });
    expect(btn).toBeDisabled();
  });

  test("si no hay usuario, al hacer click redirige a login con redirect", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<RoomCard room={baseRoom as any} />);

    const btn = screen.getByRole("button", { name: /Unirse/i });
    fireEvent.click(btn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(`/login?redirect=/room/${baseRoom.id}`);
  });

  test("si hay usuario, al hacer click redirige directamente a la sala", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: "u1", name: "andres" }, loading: false });
    render(<RoomCard room={baseRoom as any} />);

    const btn = screen.getByRole("button", { name: /Unirse/i });
    fireEvent.click(btn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(`/room/${baseRoom.id}`);
  });

  test("muestra avatares y badge +N cuando hay más de 3 participantes", () => {
    // member_count = 5 in baseRoom
    const { container } = render(<RoomCard room={baseRoom as any} />);

    // Los avatares (y el badge +N) usan la clase 'w-8', así que contamos elementos con esa clase
    const w8Elements = container.getElementsByClassName("w-8");
    // 3 avatares + 1 badge "+2" = 4 elementos
    expect(w8Elements.length).toBe(4);

    // badge +2 debe estar en el DOM
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  test("muestra exactamente N avatares cuando N <= 3 y no muestra badge +N", () => {
    const smallRoom = { ...baseRoom, member_count: 2 };
    const { container } = render(<RoomCard room={smallRoom as any} />);

    const w8Elements = container.getElementsByClassName("w-8");
    // Should be 2 avatar elements and no "+N" badge
    expect(w8Elements.length).toBe(2);
    expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
  });
});