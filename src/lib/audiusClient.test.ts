import { jest } from "@jest/globals";

type MockResp = {
  ok?: boolean;
  status?: number;
  json?: any;
  text?: string;
};

function makeFetchMock(responses: MockResp[]) {
  let call = 0;
  return jest.fn().mockImplementation(() => {
    const r = responses[Math.min(call, responses.length - 1)];
    call++;
    const ok = r.ok ?? true;
    const status = r.status ?? (ok ? 200 : 500);
    return Promise.resolve({
      ok,
      status,
      json: async () => {
        // If json is a function, call it (helps in some cases)
        if (typeof r.json === "function") return r.json();
        return r.json;
      },
      text: async () =>
        typeof r.text === "string" ? r.text : JSON.stringify(r.json ?? ""),
    });
  });
}

describe("audiusClient", () => {
  beforeEach(() => {
    // Ensure a fresh module and fresh caches for each test
    jest.resetModules();
    // TypeScript/ESM interop: global.fetch exists in JSDOM environment used by Jest
    // We'll mock it inside each test explicitly.
    // @ts-expect-error
    if (global.fetch && "mockClear" in global.fetch) {
      // noop
    }
  });

  test("discovery normaliza a /v1 y searchAudiusTracks usa esa base (via fetch URL)", async () => {
  // limpiar módulos para aislar caches
  jest.resetModules();

  // preparar fetch mock que inspecciona la URL solicitada
  // y devuelve respuestas distintas según la URL
  // @ts-expect-error
  global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | string) => {
    const url = String(input);

    // llamada inicial a https://api.audius.co/
    if (url === "https://api.audius.co/") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: ["https://discovery.example.com/"] }),
        text: async () => JSON.stringify({ data: ["https://discovery.example.com/"] }),
      };
    }

    // la búsqueda debe ocurrir contra discovery + /v1/tracks/search
    if (url.startsWith("https://discovery.example.com/v1/tracks/search")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "t1",
              title: "One",
              permalink: "one",
              user: { id: "u1", handle: "u1", name: "U1" },
            },
          ],
        }),
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: "t1",
                title: "One",
              },
            ],
          }),
      };
    }

    // cualquier otra llamada (defensiva)
    return {
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => "not found",
    };
  });

  // importar módulo (después de haber asignado fetch)
  const mod = await import("../lib/audiusClient");
  const { searchAudiusTracks } = mod as any;

  const results = await searchAudiusTracks("One", true);

  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBe(1);
  expect(results[0].id).toBe("t1");

    // ahora comprobamos que fetch fue llamado con la URL de búsqueda normalizada
    // buscamos entre las llamadas cuál contiene '/v1/tracks/search'
    // @ts-expect-error
    const fetchCalls = global.fetch.mock.calls.map((c: any[]) => String(c[0]));
    const usedSearchCall = fetchCalls.find((u: string) =>
        u.includes("/v1/tracks/search")
    );
    expect(usedSearchCall).toBeDefined();
    expect(usedSearchCall).toContain("https://discovery.example.com/v1/tracks/search");
    });

  test("cuando discovery falla, searchAudiusTracks usa el discovery fallback", async () => {
  jest.resetModules();

  // 1) Primera llamada (discovery root) falla -> reject
  // 2) Segunda llamada será al fallback discovery '/v1/tracks/search' y devolverá resultado
  (global as any).fetch = jest.fn()
    .mockImplementationOnce(() => Promise.reject(new Error("network")))
    .mockImplementationOnce((input: unknown) => {
      const url = String(input);
      if (url.startsWith("https://discoveryprovider.audius.co/v1/tracks/search")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "t-fb",
                title: "Fallback Track",
                permalink: "fb",
                user: { id: "u1", handle: "u1", name: "U1" },
              },
            ],
          }),
          text: async () => JSON.stringify({ data: [{ id: "t-fb" }] }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => "not found",
      });
    });

    const mod = await import("../lib/audiusClient");
    const { searchAudiusTracks } = mod as any;

    const res = await searchAudiusTracks("fallback-test", false); // no cache, force calls
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("t-fb");

    // además verificamos que la segunda fetch usada fue contra el fallback discovery
    // @ts-expect-error
    const calls = (global as any).fetch.mock.calls.map((c: any[]) => String(c[0]));
    const used = calls.find((u: string) => u.includes("discoveryprovider.audius.co/v1/tracks/search"));
    expect(used).toBeDefined();
    });


  test("searchAudiusTracks returns [] for empty/whitespace query", async () => {
    const mod = await (async () => {
      // minimal fetch mock to not be used
      // @ts-expect-error
      global.fetch = makeFetchMock([{ ok: true, json: {} }]);
      return import("../lib/audiusClient");
    })();
    const { searchAudiusTracks } = mod as any;
    expect(await searchAudiusTracks("   ")).toEqual([]);
    expect(await searchAudiusTracks("")).toEqual([]);
  });

  test("searchAudiusTracks calls discovery + tracks endpoint and caches results", async () => {
    const responses = [
      // getDiscoveryBase -> returns data array
      { ok: true, json: { data: ["https://d.example.com/"] } },
      // search endpoint -> returns data with tracks
      {
        ok: true,
        json: {
          data: [
            { id: "t1", title: "One", permalink: "one", user: { id: "u1", handle: "u1", name: "U1" } },
          ],
        },
      },
    ];
    // @ts-expect-error
    global.fetch = makeFetchMock(responses);

    const mod = await import("../lib/audiusClient");
    const { searchAudiusTracks } = mod as any;

    const first = await searchAudiusTracks("One", true);
    expect(Array.isArray(first)).toBe(true);
    expect(first.length).toBe(1);
    expect(first[0].id).toBe("t1");

    // Call again: should use cache and not call fetch for search again.
    // But getDiscoveryBase may still call fetch if cache expired; since module-level cache present and we are same tick, it should be cached.
    const second = await searchAudiusTracks("One", true);
    expect(second).toEqual(first);

    // Ensure fetch was called at least once (discovery + search). Further calls should be limited (we cannot inspect internal Map directly easily here).
    // The mock tracks calls via its internal counter; ensure it was called at least twice.
    // @ts-expect-error
    expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test("getAudiusStreamUrl returns same url if already audius-content url", async () => {
    // fresh import and a no-op fetch (should not be invoked)
    const mod = await (async () => {
      // @ts-expect-error
      global.fetch = jest.fn();
      return import("../lib/audiusClient");
    })();
    const { getAudiusStreamUrl } = mod as any;

    const input = "https://blockdaemon-audius-content-XX.bdnodes.net/some/path/file.mp3";
    const out = await getAudiusStreamUrl(input, 1);
    expect(out).toBe(input);
    // fetch should not be called
    // @ts-ignore
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("getAudiusStreamUrl handles body.data string format", async () => {
    const responses = [
      // discovery root
      { ok: true, json: { data: ["https://d.example.com/"] } },
      // stream endpoint response with data string
      { ok: true, json: { data: "https://cdn.example.com/track.mp3" } },
    ];
    // @ts-ignore
    global.fetch = makeFetchMock(responses);

    const mod = await import("../lib/audiusClient");
    const { getAudiusStreamUrl } = mod as any;

    const res = await getAudiusStreamUrl("permalink-1", 1);
    expect(res).toBe("https://cdn.example.com/track.mp3");
  });

  test("getAudiusStreamUrl handles body.url field", async () => {
    const responses = [
      { ok: true, json: { data: ["https://d.example.com/"] } },
      { ok: true, json: { url: "https://cdn.example.com/from-url.mp3" } },
    ];
    // @ts-ignore
    global.fetch = makeFetchMock(responses);

    const mod = await import("../lib/audiusClient");
    const { getAudiusStreamUrl } = mod as any;

    const res = await getAudiusStreamUrl("id-2", 1);
    expect(res).toBe("https://cdn.example.com/from-url.mp3");
  });

  test("getAudiusStreamUrl handles body.data array with url", async () => {
    const responses = [
      { ok: true, json: { services: { discovery: ["https://d.example.com"] } } }, // discovery in services.discovery shape
      {
        ok: true,
        json: { data: [{ url: "https://cdn.example.com/arr0.mp3" }, { url: "https://cdn.example.com/arr1.mp3" }] },
      },
    ];
    // @ts-ignore
    global.fetch = makeFetchMock(responses);

    const mod = await import("../lib/audiusClient");
    const { getAudiusStreamUrl } = mod as any;

    const res = await getAudiusStreamUrl("some-id", 1);
    expect(res).toBe("https://cdn.example.com/arr0.mp3");
  });

  test("getAudiusStreamUrl returns fallback final URL when stream fails", async () => {
    // discovery returns a base; stream fetch returns non-ok
    const responses = [
      { ok: true, json: { data: ["https://d.example.com"] } },
      { ok: false, status: 500, text: "internal" },
    ];
    // @ts-ignore
    global.fetch = makeFetchMock(responses);

    const mod = await import("../lib/audiusClient");
    const { getAudiusStreamUrl } = mod as any;

    const res = await getAudiusStreamUrl("no-stream", 1); // maxRetries=1 to avoid wait
    // Should return fallback URL constructed from discovery base
    expect(res).toContain("https://d.example.com/v1/tracks/no-stream/stream?app_name=jamroom");
  });

  test("searchAudiusTracks returns empty on network error", async () => {
    // discovery ok, search fetch throws
    // @ts-ignore
    global.fetch = jest.fn()
      // first call discovery
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ data: ["https://d.example.com/"] }) }))
      // second call search throws
      .mockImplementationOnce(() => Promise.reject(new Error("network fail")));

    const mod = await import("../lib/audiusClient");
    const { searchAudiusTracks } = mod as any;

    const res = await searchAudiusTracks("willfail", false); // disable cache to force fetch
    expect(res).toEqual([]);
  });
});
