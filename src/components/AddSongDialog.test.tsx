import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import AddSongDialog from "../components/AddSongDialog";

// Mocks del cliente de Audius
jest.mock("@/lib/audiusClient", () => ({
  searchAudiusTracks: jest.fn(),
  getAudiusStreamUrl: jest.fn(),
}));

import {
  searchAudiusTracks,
  getAudiusStreamUrl,
} from "../lib/audiusClient";

const mockedSearch = searchAudiusTracks as jest.MockedFunction<
  typeof searchAudiusTracks
>;
const mockedGetStream = getAudiusStreamUrl as jest.MockedFunction<
  typeof getAudiusStreamUrl
>;

describe("AddSongDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
  });

  test("no renderiza nada cuando open=false", () => {
    const onOpenChange = jest.fn();
    render(
      <AddSongDialog
        open={false}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.queryByText("Añadir canción")).not.toBeInTheDocument();
  });

  test("buscar en Audius muestra resultados y seleccionar track llama onAddSong (caso añadir a cola)", async () => {
    const tracks = [
      {
        id: "t1",
        title: "Test Song 1",
        permalink: "/t1",
        artwork: { "150x150": "http://img/1.jpg" },
        user: { id: "u1", name: "Artist1", handle: "a1" },
      },
      {
        id: "t2",
        title: "Test Song 2",
        permalink: "/t2",
        artwork: {},
        user: { id: "u2", handle: "a2", name: "Artist2" },
      },
    ] as any;

    mockedSearch.mockResolvedValueOnce(tracks);

    const onOpenChange = jest.fn();
    const onAddSong = jest.fn().mockResolvedValue(undefined);

    render(
      <AddSongDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddSong={onAddSong}
      />
    );

    // escribe consulta
    const input = screen.getByPlaceholderText(
      /Buscar por título o artista…/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });

    // seleccionamos el botón de submit EXACTO (evitamos el tab "Buscar en Audius")
    const submitBtn = screen.getByRole("button", { name: /^Buscar$/i });
    fireEvent.click(submitBtn);

    // espera a que aparezcan resultados
    await waitFor(() => {
      expect(screen.getByText("Test Song 1")).toBeInTheDocument();
      expect(screen.getByText("Test Song 2")).toBeInTheDocument();
    });

    // clic en la primera pista -> debe llamar onAddSong con id y metadata
    const first = screen.getByText("Test Song 1");
    fireEvent.click(first);

    await waitFor(() => {
      expect(onAddSong).toHaveBeenCalledTimes(1);
      expect(onAddSong).toHaveBeenCalledWith("t1", expect.objectContaining({
        title: "Test Song 1",
        artist: "Artist1",
        artworkUrl: "http://img/1.jpg",
      }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("cuando search devuelve [] muestra mensaje de 'No se encontraron resultados en Audius.'", async () => {
    mockedSearch.mockResolvedValueOnce([]);

    render(
      <AddSongDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText(
      /Buscar por título o artista…/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "nothing" } });

    const submitBtn = screen.getByRole("button", { name: /^Buscar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("No se encontraron resultados en Audius.")).toBeInTheDocument();
    });
  });

  test("cuando search lanza error muestra 'Error al buscar en Audius.'", async () => {
    mockedSearch.mockRejectedValueOnce(new Error("network"));

    render(
      <AddSongDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText(
      /Buscar por título o artista…/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "err" } });

    const submitBtn = screen.getByRole("button", { name: /^Buscar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Error al buscar en Audius.")).toBeInTheDocument();
    });
  });

  test("ruta de selección que usa onChangeExternalTrack: obtiene streamUrl y llama onChangeExternalTrack", async () => {
    const tracks = [
      {
        id: "a1",
        title: "External Song",
        permalink: "/a1",
        artwork: { "150x150": undefined },
        user: { id: "u3", handle: "h1", name: "H1" },
      },
    ] as any;

    mockedSearch.mockResolvedValueOnce(tracks);
    mockedGetStream.mockResolvedValueOnce("https://stream/a1.mp3");

    const onOpenChange = jest.fn();
    const onChangeExternalTrack = jest.fn();

    render(
      <AddSongDialog
        open={true}
        onOpenChange={onOpenChange}
        onChangeExternalTrack={onChangeExternalTrack}
      />
    );

    // buscar
    fireEvent.change(
      screen.getByPlaceholderText(/Buscar por título o artista…/i),
      { target: { value: "ext" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^Buscar$/i }));

    // espera resultados
    await waitFor(() => {
      expect(screen.getByText("External Song")).toBeInTheDocument();
    });

    // click en resultado
    fireEvent.click(screen.getByText("External Song"));

    await waitFor(() => {
      expect(mockedGetStream).toHaveBeenCalledWith("a1");
      expect(onChangeExternalTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          trackId: "a1",
          streamUrl: "https://stream/a1.mp3",
          title: "External Song",
          source: "audius",
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("si getAudiusStreamUrl devuelve null muestra mensaje de error", async () => {
    const tracks = [
      {
        id: "b1",
        title: "Broken Stream",
        permalink: "/b1",
        artwork: {},
        user: { id: "u4", name: "Artist", handle: "artist" },
      },
    ] as any;

    mockedSearch.mockResolvedValueOnce(tracks);
    mockedGetStream.mockResolvedValueOnce(null);

    render(
      <AddSongDialog
        open={true}
        onOpenChange={jest.fn()}
        onChangeExternalTrack={jest.fn()}
      />
    );

    // buscar
    fireEvent.change(
      screen.getByPlaceholderText(/Buscar por título o artista…/i),
      { target: { value: "b" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^Buscar$/i }));

    await waitFor(() => {
      expect(screen.getByText("Broken Stream")).toBeInTheDocument();
    });

    // seleccionar
    fireEvent.click(screen.getByText("Broken Stream"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo obtener el stream de este track. Intenta con otro.")).toBeInTheDocument();
    });
  });

  test("pestaña manual: añadir por ID llama onAddSong y cierra (handleManualAdd)", async () => {
    const onOpenChange = jest.fn();
    const onAddSong = jest.fn().mockResolvedValue(undefined);

    render(
      <AddSongDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddSong={onAddSong}
      />
    );

    // cambiar a tab manual
    fireEvent.click(screen.getByRole("button", { name: /Añadir por ID/i }));

    // ingresa id
    const manualInput = screen.getByPlaceholderText(/p. ej. a1b2c3/i) as HTMLInputElement;
    fireEvent.change(manualInput, { target: { value: "my-track-123" } });

    const addBtn = screen.getByRole("button", { name: /^Añadir$/i });
    expect(addBtn).toBeEnabled();

    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(onAddSong).toHaveBeenCalledWith("my-track-123", expect.objectContaining({
        title: "Canción añadida",
      }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("muestra 'Buscando…' en el botón mientras la búsqueda está en curso", async () => {
    jest.useFakeTimers();

    mockedSearch.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve([
          { id: "z1", title: "Zed", permalink: "/z1", artwork: {}, user: { id: "u5", handle: "z", name: "Zed Artist" } }
        ]), 1000);
      });
    });

    render(
      <AddSongDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText(/Buscar por título o artista…/i),
      { target: { value: "zed" } }
    );

    const submitBtn = screen.getByRole("button", { name: /^Buscar$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByRole("button", { name: /Buscando…/i })).toBeInTheDocument();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Zed")).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
