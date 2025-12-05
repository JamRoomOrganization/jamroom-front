import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import QueueList from "../components/QueueList";

type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  cover_url?: string;
  artworkUrl?: string;
  streamUrl?: string;
  url?: string;
};

describe("QueueList", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test("muestra el estado vacío cuando la cola está vacía", () => {
    render(<QueueList queue={[]} />);

    expect(screen.getByText(/No hay canciones en la cola/i)).toBeInTheDocument();
    expect(screen.getByText(/¡Añade una para empezar!/i)).toBeInTheDocument();
  });

  test("renderiza la lista de tracks con índices empezando en 1", () => {
    const queue: Track[] = [
      { id: "t1", title: "Song A", artist: "Artist A", duration: 60 },
      { id: "t2", title: "Song B", artist: "Artist B", duration: 125 },
    ];

    render(<QueueList queue={queue} />);

    // títulos y artistas
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    expect(screen.getByText("Artist A")).toBeInTheDocument();
    expect(screen.getByText("Artist B")).toBeInTheDocument();

    // índices "1" y "2"
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // duración formateada: 60 -> 1:00, 125 -> 2:05
    expect(screen.getByText("1:00")).toBeInTheDocument();
    expect(screen.getByText("2:05")).toBeInTheDocument();
  });

  test("muestra la imagen de artwork si artworkUrl o cover_url existen", () => {
    const queue: Track[] = [
      { id: "t1", title: "WithArt", artworkUrl: "http://img.test/1.jpg" },
      { id: "t2", title: "NoArt" },
    ];

    render(<QueueList queue={queue} />);

    // la primera debe tener un <img> con alt=title y src
    const img = screen.getByAltText("WithArt") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("http://img.test/1.jpg");

    // la segunda no debe tener imagen con alt "NoArt" (porque no tiene artwork)
    expect(screen.queryByAltText("NoArt")).not.toBeInTheDocument();
  });

  test("al hacer click en '+ Añadir' se llama onAddClick", () => {
    const onAdd = jest.fn();
    render(<QueueList queue={[]} onAddClick={onAdd} />);

    const addBtn = screen.getByRole("button", { name: /\+ Añadir/i });
    fireEvent.click(addBtn);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test("al hacer click en un track se llama onSelectTrack con el id correspondiente", () => {
    const onSelect = jest.fn();
    const queue: Track[] = [
      { id: "t1", title: "Song A" },
      { id: "t2", title: "Song B" },
    ];

    const { container } = render(
      <QueueList queue={queue} onSelectTrack={onSelect} />
    );

    // los items son divs clickeables; buscamos por texto y subimos al contenedor padre
    const item = screen.getByText("Song B").closest("div");
    expect(item).toBeTruthy();

    fireEvent.click(item!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("t2");

    // aseguramos que el orden/índice se muestra correctamente (2)
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("resalta el track actual (currentTrack) y muestra el icono de reproducción (animate-pulse)", () => {
    const queue: Track[] = [
      { id: "t1", title: "Song A", duration: 30 },
      { id: "t2", title: "Song B", duration: 45 },
    ];

    const current = queue[1]; // t2
    const { container } = render(
      <QueueList queue={queue} currentTrack={current} />
    );

    // el item seleccionado debe tener la clase que aplica bg/purple — comprobamos el texto y la presencia del .animate-pulse
    expect(screen.getByText("Song B")).toBeInTheDocument();

    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).toBeInTheDocument();
  });
});
