/**
 * Tests para useLiveKitVoiceClient hook.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useLiveKitVoiceClient } from "./useLiveKitVoiceClient";

// Variables mock definidas con prefijo 'mock' para hoisting de Jest
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockPublishTrack = jest.fn();
const mockRoomOn = jest.fn();
const mockRoomOff = jest.fn();
const mockTrackStop = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockStartAudio = jest.fn();

// Almacena los handlers de eventos registrados
let eventHandlers: Record<string, Function> = {};

const mockRoomInstance = {
    connect: mockConnect,
    disconnect: mockDisconnect,
    localParticipant: {
        publishTrack: mockPublishTrack,
    },
    on: jest.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockRoomInstance;
    }),
    off: mockRoomOff,
    removeAllListeners: mockRemoveAllListeners,
    startAudio: mockStartAudio,
    canPlaybackAudio: true,
};

const mockLocalAudioTrackInstance = {
    stop: mockTrackStop,
};

// Mock de livekit-client - debe estar después de las definiciones de mock*
jest.mock("livekit-client", () => {
    return {
        Room: jest.fn(() => mockRoomInstance),
        createLocalAudioTrack: jest.fn(() => Promise.resolve(mockLocalAudioTrackInstance)),
        RoomEvent: {
            TrackSubscribed: "TrackSubscribed",
            TrackUnsubscribed: "TrackUnsubscribed",
            Disconnected: "Disconnected",
            Reconnecting: "Reconnecting",
            Reconnected: "Reconnected",
        },
        Track: {
            Kind: {
                Audio: "audio",
                Video: "video",
            },
        },
        DisconnectReason: {
            CLIENT_INITIATED: "CLIENT_INITIATED",
            DUPLICATE_IDENTITY: "DUPLICATE_IDENTITY",
            SERVER_SHUTDOWN: "SERVER_SHUTDOWN",
            PARTICIPANT_REMOVED: "PARTICIPANT_REMOVED",
            ROOM_DELETED: "ROOM_DELETED",
            STATE_MISMATCH: "STATE_MISMATCH",
            JOIN_FAILURE: "JOIN_FAILURE",
            UNKNOWN_REASON: "UNKNOWN_REASON",
        },
    };
});

// Mock del socket
function createMockSocket() {
    const listeners: Record<string, Function[]> = {};

    return {
        connected: true,
        on: jest.fn((event: string, callback: Function) => {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);
        }),
        off: jest.fn((event: string, callback?: Function) => {
            if (callback && listeners[event]) {
                listeners[event] = listeners[event].filter((cb) => cb !== callback);
            } else if (!callback) {
                delete listeners[event];
            }
        }),
        emit: jest.fn(),
        // Helper para simular eventos entrantes
        _trigger: (event: string, payload: unknown) => {
            if (listeners[event]) {
                listeners[event].forEach((cb) => cb(payload));
            }
        },
        _listeners: listeners,
    };
}

// Helper para crear un mock de MediaStream
function createMockMediaStream(): MediaStream {
    const mockTrack = {
        stop: jest.fn(),
        kind: "audio",
        id: "mock-track-id",
        label: "Mock Audio Track",
        enabled: true,
        muted: false,
        readyState: "live",
        getSettings: jest.fn(() => ({ deviceId: "mock-device-id" })),
    };

    const mockStream = {
        getTracks: jest.fn(() => [mockTrack]),
        getAudioTracks: jest.fn(() => [mockTrack]),
        getVideoTracks: jest.fn(() => []),
        id: "mock-stream-id",
        active: true,
    };

    return mockStream as unknown as MediaStream;
}

// Mock de voiceSession payload
const mockVoiceSession = {
    sessionId: "session-123",
    roomId: "room-1",
    userId: "user-123",
    livekit: {
        roomName: "room-1-voice",
        identity: "user-123",
        token: "mock-livekit-token",
        url: "wss://livekit.example.com",
        expiresAt: "2025-12-02T02:00:00.000Z",
    },
};

describe("useLiveKitVoiceClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Clear event handlers
        eventHandlers = {};

        // Reset mock implementations
        mockConnect.mockResolvedValue(undefined);
        mockDisconnect.mockReturnValue(undefined);
        mockPublishTrack.mockResolvedValue(undefined);
        mockRemoveAllListeners.mockReturnValue(undefined);
        mockStartAudio.mockResolvedValue(undefined);
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.useRealTimers();
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT está deshabilitada", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT = "false";
        });

        it("devuelve un resultado no-op", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: false,
                    mediaStream: null,
                })
            );

            expect(result.current.connected).toBe(false);
            expect(result.current.connecting).toBe(false);
            expect(result.current.reconnecting).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.errorType).toBeNull();
            expect(result.current.reconnectAttempts).toBe(0);
        });

        it("no registra listeners de socket", () => {
            const mockSocket = createMockSocket();

            renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: true,
                    mediaStream: createMockMediaStream(),
                })
            );

            expect(mockSocket.on).not.toHaveBeenCalledWith(
                "voice:session",
                expect.any(Function)
            );
        });

        it("no crea instancia de Room", () => {
            const mockSocket = createMockSocket();
            const { Room } = require("livekit-client");

            renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: true,
                    mediaStream: createMockMediaStream(),
                })
            );

            // Trigger voice:session (should be ignored)
            mockSocket._trigger("voice:session", mockVoiceSession);

            expect(Room).not.toHaveBeenCalled();
        });
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT está habilitada", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT = "true";
        });

        it("inicializa con estado por defecto", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: false,
                    mediaStream: null,
                })
            );

            expect(result.current.connected).toBe(false);
            expect(result.current.connecting).toBe(false);
            expect(result.current.reconnecting).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.errorType).toBeNull();
            expect(result.current.reconnectAttempts).toBe(0);
        });

        it("registra listener de voice:session en el socket", () => {
            const mockSocket = createMockSocket();

            renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: false,
                    mediaStream: null,
                })
            );

            expect(mockSocket.on).toHaveBeenCalledWith(
                "voice:session",
                expect.any(Function)
            );
        });

        it("desregistra listener al desmontar", () => {
            const mockSocket = createMockSocket();

            const { unmount } = renderHook(() =>
                useLiveKitVoiceClient({
                    roomId: "room-1",
                    socket: mockSocket as any,
                    joined: false,
                    mediaStream: null,
                })
            );

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith(
                "voice:session",
                expect.any(Function)
            );
        });

        describe("cuando recibe voice:session pero joined=false", () => {
            it("no conecta a LiveKit", () => {
                const mockSocket = createMockSocket();
                const { Room } = require("livekit-client");

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: false,
                        mediaStream: createMockMediaStream(),
                    })
                );

                // Trigger voice:session
                act(() => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                });

                expect(Room).not.toHaveBeenCalled();
                expect(mockConnect).not.toHaveBeenCalled();
            });
        });

        describe("cuando recibe voice:session con roomId diferente", () => {
            it("ignora el evento", () => {
                const mockSocket = createMockSocket();
                const { Room } = require("livekit-client");

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: createMockMediaStream(),
                    })
                );

                // Trigger voice:session con roomId diferente
                act(() => {
                    mockSocket._trigger("voice:session", {
                        ...mockVoiceSession,
                        roomId: "other-room",
                    });
                });

                expect(Room).not.toHaveBeenCalled();
            });
        });

        describe("cuando joined=true, mediaStream presente y voice:session recibido", () => {
            it("llama a Room.connect con url y token correctos", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();
                const { Room } = require("livekit-client");

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Trigger voice:session
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    // Advance timers to allow async operations to complete
                    await jest.advanceTimersByTimeAsync(10);
                });

                expect(Room).toHaveBeenCalled();
                expect(mockConnect).toHaveBeenCalledWith(
                    mockVoiceSession.livekit.url,
                    mockVoiceSession.livekit.token
                );
            });

            it("actualiza el estado a connected=true", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                    expect(result.current.connecting).toBe(false);
                });
            });
        });

        describe("cuando Room.connect lanza error", () => {
            it("setea error y connected=false", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                // Hacer que connect falle
                mockConnect.mockRejectedValueOnce(new Error("Connection failed"));

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.error).toBe(
                        "Error al conectar con el servidor de voz. Intenta nuevamente."
                    );
                    expect(result.current.connected).toBe(false);
                    expect(result.current.connecting).toBe(false);
                });
            });
        });

        describe("al desmontar el componente", () => {
            it("llama a disconnect y para el LocalAudioTrack", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { unmount } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Desmontar
                unmount();

                expect(mockDisconnect).toHaveBeenCalled();
                expect(mockTrackStop).toHaveBeenCalled();
            });
        });

        describe("cuando joined cambia a false", () => {
            it("desconecta de LiveKit", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { result, rerender } = renderHook(
                    ({ joined }) =>
                        useLiveKitVoiceClient({
                            roomId: "room-1",
                            socket: mockSocket as any,
                            joined,
                            mediaStream: mockStream,
                        }),
                    { initialProps: { joined: true } }
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Cambiar joined a false
                rerender({ joined: false });

                await waitFor(() => {
                    expect(mockDisconnect).toHaveBeenCalled();
                    expect(result.current.connected).toBe(false);
                });
            });
        });

        describe("cuando mediaStream cambia a null", () => {
            it("desconecta de LiveKit", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { result, rerender } = renderHook(
                    ({ mediaStream }) =>
                        useLiveKitVoiceClient({
                            roomId: "room-1",
                            socket: mockSocket as any,
                            joined: true,
                            mediaStream,
                        }),
                    { initialProps: { mediaStream: mockStream as MediaStream | null } }
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Cambiar mediaStream a null
                rerender({ mediaStream: null });

                await waitFor(() => {
                    expect(mockDisconnect).toHaveBeenCalled();
                    expect(result.current.connected).toBe(false);
                });
            });
        });

        describe("cuando socket es null", () => {
            it("no registra listeners", () => {
                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: null,
                        joined: true,
                        mediaStream: createMockMediaStream(),
                    })
                );

                expect(result.current.connected).toBe(false);
                expect(result.current.connecting).toBe(false);
            });
        });

        describe("reconexión automática", () => {
            it("intenta reconectar después de una desconexión inesperada", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();
                const { DisconnectReason } = require("livekit-client");

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Reset mocks para el reintento
                mockConnect.mockClear();

                // Simular desconexión inesperada
                await act(async () => {
                    if (eventHandlers["Disconnected"]) {
                        eventHandlers["Disconnected"](DisconnectReason.SERVER_SHUTDOWN);
                    }
                });

                // Debe estar reconectando
                expect(result.current.reconnecting).toBe(true);
                expect(result.current.connected).toBe(false);

                // Avanzar el timer para el primer intento
                await act(async () => {
                    await jest.advanceTimersByTimeAsync(1000);
                });

                // Debe haber intentado reconectar
                expect(mockConnect).toHaveBeenCalled();
            });

            it("marca reconnecting=true durante la reconexión", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();
                const { DisconnectReason } = require("livekit-client");

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Simular desconexión
                await act(async () => {
                    if (eventHandlers["Disconnected"]) {
                        eventHandlers["Disconnected"](DisconnectReason.UNKNOWN_REASON);
                    }
                });

                expect(result.current.reconnecting).toBe(true);
            });

            it("no reintenta en errores de autenticación", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                // Hacer que connect falle con error de auth
                mockConnect.mockRejectedValueOnce(new Error("401 Unauthorized"));

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Trigger voice:session
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.errorType).toBe("AUTH_FAILED");
                });

                // No debe estar reconectando
                expect(result.current.reconnecting).toBe(false);
                // Debe tener max attempts para indicar que no reintentará
                expect(result.current.reconnectAttempts).toBe(3);
            });

            it("deja de reintentar después de alcanzar el límite máximo", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                // Hacer que connect falle repetidamente
                mockConnect.mockRejectedValue(new Error("Network error"));

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Primera conexión falla
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Avanzar por todos los reintentos (1s, 2s, 4s backoff)
                for (let i = 0; i < 3; i++) {
                    await act(async () => {
                        await jest.advanceTimersByTimeAsync(5000);
                    });
                }

                await waitFor(() => {
                    // Los errores de red/fetch ahora se marcan como LIVEKIT_UNAVAILABLE
                    expect(result.current.errorType).toBe("LIVEKIT_UNAVAILABLE");
                    expect(result.current.reconnecting).toBe(false);
                });
            });

            it("retryConnection permite reintentar manualmente", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                // Hacer que connect falle inicialmente
                mockConnect.mockRejectedValueOnce(new Error("Network error"));

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Primera conexión falla
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Esperar todos los reintentos automáticos
                await act(async () => {
                    await jest.advanceTimersByTimeAsync(15000);
                });

                await waitFor(() => {
                    expect(result.current.error).not.toBeNull();
                });

                // Resetear mock para que la próxima conexión funcione
                mockConnect.mockResolvedValueOnce(undefined);

                // Llamar retryConnection
                await act(async () => {
                    result.current.retryConnection();
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                    expect(result.current.error).toBeNull();
                });
            });

            it("resetea reconnectAttempts después de una conexión exitosa", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();
                const { DisconnectReason } = require("livekit-client");

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Hacer que el siguiente intento falle y luego funcione
                // Usamos "Server error" en vez de "Network" para evitar que sea tratado como LIVEKIT_UNAVAILABLE
                mockConnect.mockRejectedValueOnce(new Error("Server error"));
                mockConnect.mockResolvedValueOnce(undefined);

                // Simular desconexión
                await act(async () => {
                    if (eventHandlers["Disconnected"]) {
                        eventHandlers["Disconnected"](DisconnectReason.SERVER_SHUTDOWN);
                    }
                });

                // Avanzar para que reintente y falle
                await act(async () => {
                    await jest.advanceTimersByTimeAsync(1000);
                });

                // Debe tener 1 intento
                expect(result.current.reconnectAttempts).toBe(1);

                // Avanzar para el segundo intento (exitoso)
                await act(async () => {
                    await jest.advanceTimersByTimeAsync(2000);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                    expect(result.current.reconnectAttempts).toBe(0);
                });
            });

            it("maneja evento Reconnecting del SDK de LiveKit", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Simular evento Reconnecting del SDK
                await act(async () => {
                    if (eventHandlers["Reconnecting"]) {
                        eventHandlers["Reconnecting"]();
                    }
                });

                expect(result.current.reconnecting).toBe(true);
            });

            it("maneja evento Reconnected del SDK de LiveKit", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const { result } = renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                await waitFor(() => {
                    expect(result.current.connected).toBe(true);
                });

                // Simular Reconnecting seguido de Reconnected
                await act(async () => {
                    if (eventHandlers["Reconnecting"]) {
                        eventHandlers["Reconnecting"]();
                    }
                });

                expect(result.current.reconnecting).toBe(true);

                await act(async () => {
                    if (eventHandlers["Reconnected"]) {
                        eventHandlers["Reconnected"]();
                    }
                });

                expect(result.current.reconnecting).toBe(false);
                expect(result.current.connected).toBe(true);
            });
        });

        describe("audio element handling para tracks remotos", () => {
            it("crea y agrega elementos de audio al DOM cuando recibe TrackSubscribed", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                // Mock del audio element
                // Mock del audio element
                const mockAudioElement = {
                    autoplay: false,
                    playsInline: false,
                    muted: true,
                    src: "",
                    srcObject: null,
                    setAttribute: jest.fn(),
                    play: jest.fn(() => Promise.resolve()),
                };

                const mockRemoteTrack = {
                    kind: "audio",
                    sid: "track-sid-123",
                    attach: jest.fn(() => mockAudioElement),
                    detach: jest.fn(),
                };

                const mockRemoteParticipant = {
                    identity: "remote-user-123",
                    isLocal: false,
                };

                // Render first, then mock appendChild
                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Mock document.body.appendChild after render
                const appendChildMock = jest.fn();
                const originalAppendChild = document.body.appendChild.bind(document.body);
                document.body.appendChild = appendChildMock;

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Simular TrackSubscribed
                await act(async () => {
                    if (eventHandlers["TrackSubscribed"]) {
                        eventHandlers["TrackSubscribed"](mockRemoteTrack, {}, mockRemoteParticipant);
                    }
                });

                // Verificar que se llamó attach()
                expect(mockRemoteTrack.attach).toHaveBeenCalled();

                // Verificar que el audio element se configuró correctamente
                expect(mockAudioElement.setAttribute).toHaveBeenCalledWith("data-voice-remote", "true");
                expect(mockAudioElement.setAttribute).toHaveBeenCalledWith("data-participant-id", "remote-user-123");
                expect(mockAudioElement.setAttribute).toHaveBeenCalledWith("playsinline", "true");
                expect(mockAudioElement.autoplay).toBe(true);
                expect(mockAudioElement.muted).toBe(false);

                // Verificar que se agregó al DOM
                expect(appendChildMock).toHaveBeenCalledWith(mockAudioElement);

                // Restaurar
                document.body.appendChild = originalAppendChild;
            });

            it("remueve elementos de audio del DOM cuando recibe TrackUnsubscribed", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const mockRemoteTrack = {
                    kind: "audio",
                    sid: "track-sid-456",
                    attach: jest.fn(() => []),
                    detach: jest.fn(),
                };

                const mockRemoteParticipant = {
                    identity: "remote-user-456",
                    isLocal: false,
                };

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Crear un elemento de audio mock en el DOM después del render
                const mockAudioElement = document.createElement("audio");
                mockAudioElement.setAttribute("data-voice-remote", "true");
                mockAudioElement.setAttribute("data-participant-id", "remote-user-456");
                mockAudioElement.setAttribute("data-track-sid", "track-sid-456");
                document.body.appendChild(mockAudioElement);

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Verificar que el elemento existe
                expect(document.querySelector('audio[data-track-sid="track-sid-456"]')).toBeTruthy();

                // Simular TrackUnsubscribed
                await act(async () => {
                    if (eventHandlers["TrackUnsubscribed"]) {
                        eventHandlers["TrackUnsubscribed"](mockRemoteTrack, {}, mockRemoteParticipant);
                    }
                });

                // Verificar que detach fue llamado
                expect(mockRemoteTrack.detach).toHaveBeenCalled();

                // Verificar que el elemento fue removido del DOM
                expect(document.querySelector('audio[data-track-sid="track-sid-456"]')).toBeNull();
            });

            it("ignora tracks de video en TrackSubscribed", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const mockVideoTrack = {
                    kind: "video",
                    sid: "video-track-sid",
                    attach: jest.fn(),
                    detach: jest.fn(),
                };

                const mockRemoteParticipant = {
                    identity: "remote-user-789",
                    isLocal: false,
                };

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Simular TrackSubscribed con video
                await act(async () => {
                    if (eventHandlers["TrackSubscribed"]) {
                        eventHandlers["TrackSubscribed"](mockVideoTrack, {}, mockRemoteParticipant);
                    }
                });

                // Verificar que attach NO fue llamado para video
                expect(mockVideoTrack.attach).not.toHaveBeenCalled();
            });

            it("ignora tracks locales en TrackSubscribed", async () => {
                const mockSocket = createMockSocket();
                const mockStream = createMockMediaStream();

                const mockLocalAudioTrack = {
                    kind: "audio",
                    sid: "local-audio-track-sid",
                    attach: jest.fn(),
                    detach: jest.fn(),
                };

                const mockLocalParticipant = {
                    identity: "local-user",
                    isLocal: true,
                };

                renderHook(() =>
                    useLiveKitVoiceClient({
                        roomId: "room-1",
                        socket: mockSocket as any,
                        joined: true,
                        mediaStream: mockStream,
                    })
                );

                // Conectar primero
                await act(async () => {
                    mockSocket._trigger("voice:session", mockVoiceSession);
                    await jest.advanceTimersByTimeAsync(10);
                });

                // Simular TrackSubscribed con track local
                await act(async () => {
                    if (eventHandlers["TrackSubscribed"]) {
                        eventHandlers["TrackSubscribed"](mockLocalAudioTrack, {}, mockLocalParticipant);
                    }
                });

                // Verificar que attach NO fue llamado para track local
                expect(mockLocalAudioTrack.attach).not.toHaveBeenCalled();
            });
        });
    });
});
