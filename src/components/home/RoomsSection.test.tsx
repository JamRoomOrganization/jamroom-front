import React from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RoomsSection } from "./RoomsSection";

// Mock child components to keep tests simples y deterministas
jest.mock("../RoomCard", () => {
  // default export mock: renderiza un div con data-testid y el id del room
  return {
    __esModule: true,
    default: ({ room }: any) => <div data-testid="room-card">{room.id}</div>,
  };
});

jest.mock("./RoomsSkeleton", () => {
  return {
    __esModule: true,
    RoomsSkeleton: () => <div data-testid="rooms-skeleton" />,
  };
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

function makeRooms(n: number) {
  return Array.from({ length: n }).map((_, i) => ({
    id: `r${i + 1}`,
    name: `Room ${i + 1}`,
    member_count: i + 1,
  })) as any;
}

describe("RoomsSection", () => {
  test("muestra RoomsSkeleton cuando loading=true", () => {
    const rooms = makeRooms(3);
    render(<RoomsSection rooms={rooms} loading={true} error={null} />);

    expect(screen.getByTestId("rooms-skeleton")).toBeInTheDocument();
  });

  test("muestra estado vacío cuando no hay salas y no loading", () => {
    render(<RoomsSection rooms={[]} loading={false} error={null} />);

    expect(screen.getByText("Todavía no hay salas activas.")).toBeInTheDocument();
    expect(screen.getByText("Crear sala ahora")).toBeInTheDocument();
  });

  test("muestra grid paginado y controla siguiente/anterior", () => {
    const rooms = makeRooms(10); // pageSize = 8 en el componente => 2 páginas
    render(<RoomsSection rooms={rooms} loading={false} error={null} />);

    // totalRooms badge
    expect(screen.getByText("10 salas disponibles")).toBeInTheDocument();

    // inicialmente muestra 8 RoomCard
    const cardsPage1 = screen.getAllByTestId("room-card");
    expect(cardsPage1.length).toBe(8);
    // Algunos ids esperados en la primera página
    expect(cardsPage1[0]).toHaveTextContent("r1");
    expect(cardsPage1[7]).toHaveTextContent("r8");

    // localiza el contenedor de paginación (el padre de los botones "Siguiente"/"Anterior")
    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    const pagerContainer = nextBtn.parentElement!;
    // dentro del contenedor de paginación deberían aparecer los números de página (1 y 2)
    expect(within(pagerContainer).getByText("1")).toBeInTheDocument();
    expect(within(pagerContainer).getByText("2")).toBeInTheDocument();

    // ir a la siguiente página
    fireEvent.click(nextBtn);

    // ahora deben mostrarse los 2 items restantes (r9, r10)
    const cardsPage2 = screen.getAllByTestId("room-card");
    expect(cardsPage2.length).toBe(2);
    expect(cardsPage2[0]).toHaveTextContent("r9");
    expect(cardsPage2[1]).toHaveTextContent("r10");

    // verificar indicador de página dentro del mismo contenedor
    // Como hay dos "2", usamos getAllByText y verificamos que hay al menos uno
    const twos = within(pagerContainer).getAllByText("2");
    expect(twos.length).toBe(2); // Ambos deberían estar: página actual y total

    // volver a la anterior
    const prevBtn = screen.getByRole("button", { name: /Anterior/i });
    fireEvent.click(prevBtn);
    const cardsBack = screen.getAllByTestId("room-card");
    expect(cardsBack.length).toBe(8);

    // confirmar que volvió a la página 1
    // Verificamos que hay un "1" y un "2"
    const ones = within(pagerContainer).getAllByText("1");
    const twosAgain = within(pagerContainer).getAllByText("2");
    expect(ones.length).toBe(1); // Solo debería haber un "1" (página actual)
    expect(twosAgain.length).toBe(1); // Solo debería haber un "2" (total de páginas)
  });

  test("si se reduce la lista de salas y currentPage > totalPages, se resetea a página 1", () => {
    const rooms = makeRooms(10);
    const { rerender } = render(<RoomsSection rooms={rooms} loading={false} error={null} />);

    // avanzar a la página 2
    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    const pagerContainer = nextBtn.parentElement!;
    fireEvent.click(nextBtn);

    // verificar estamos en la página 2 (dos "2" en el contenedor)
    const twos = within(pagerContainer).getAllByText("2");
    expect(twos.length).toBe(2);
    expect(screen.getAllByTestId("room-card").length).toBe(2);

    // ahora reduce la lista a sólo 2 salas -> totalPages = 1
    const small = makeRooms(2);
    rerender(<RoomsSection rooms={small} loading={false} error={null} />);

    // Cuando totalPages = 1, NO debería haber controles de paginación
    // Verificamos que NO hay botones de paginación
    expect(screen.queryByRole("button", { name: /Siguiente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Anterior/i })).not.toBeInTheDocument();

    // Verificar que estamos mostrando las 2 salas (página 1 implícita)
    const cards = screen.getAllByTestId("room-card");
    expect(cards.length).toBe(2);
    expect(cards[0]).toHaveTextContent("r1");
    expect(cards[1]).toHaveTextContent("r2");
    });

  test("muestra mensaje de error si se pasa prop error", () => {
    const rooms = makeRooms(2);
    render(<RoomsSection rooms={rooms} loading={false} error={"Ups, error"} />);

    expect(screen.getByText("Ups, error")).toBeInTheDocument();
  });
});