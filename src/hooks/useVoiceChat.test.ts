import { renderHook, act } from "@testing-library/react";
import { useVoiceChat } from "./useVoiceChat";

// Mock de AuthContext
const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" };
let mockUseAuth = jest.fn();

jest.mock("@/context/AuthContext", () => ({
    useAuth: () => mockUseAuth(),
}));

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
        off: jest.fn((event: string, callback: Function) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter((cb) => cb !== callback);
            }
        }),
        emit: jest.fn(),
        // Helper para simular eventos entrantes
        _trigger: (event: string, payload: any) => {
            if (listeners[event]) {
                listeners[event].forEach((cb) => cb(payload));
            }
        },
        _listeners: listeners,
    };
}

describe("useVoiceChat", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();
        mockUseAuth.mockReturnValue({ user: mockUser });
        // Reset environment
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE está deshabilitado", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE = "false";
        });

        it("devuelve un resultado no-op", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            expect(result.current.participants).toEqual([]);
            expect(result.current.joined).toBe(false);
            expect(result.current.muted).toBe(true);
            expect(result.current.joining).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it("joinVoice es no-op", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            act(() => {
                result.current.joinVoice();
            });

            expect(mockSocket.emit).not.toHaveBeenCalled();
            expect(result.current.joining).toBe(false);
        });

        it("leaveVoice es no-op", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            act(() => {
                result.current.leaveVoice();
            });

            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it("toggleMute es no-op", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            act(() => {
                result.current.toggleMute();
            });

            expect(mockSocket.emit).not.toHaveBeenCalled();
            expect(result.current.muted).toBe(true);
        });
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE está habilitado", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE = "true";
        });

        it("inicializa con estado por defecto", () => {
            const mockSocket = createMockSocket();

            const { result } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            expect(result.current.participants).toEqual([]);
            expect(result.current.joined).toBe(false);
            expect(result.current.muted).toBe(true);
            expect(result.current.joining).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it("registra listeners de socket al montar", () => {
            const mockSocket = createMockSocket();

            renderHook(() => useVoiceChat("room-1", mockSocket as any));

            expect(mockSocket.on).toHaveBeenCalledWith(
                "voice:state",
                expect.any(Function)
            );
            expect(mockSocket.on).toHaveBeenCalledWith(
                "voice:error",
                expect.any(Function)
            );
        });

        it("desregistra listeners de socket al desmontar", () => {
            const mockSocket = createMockSocket();

            const { unmount } = renderHook(() =>
                useVoiceChat("room-1", mockSocket as any)
            );

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith(
                "voice:state",
                expect.any(Function)
            );
            expect(mockSocket.off).toHaveBeenCalledWith(
                "voice:error",
                expect.any(Function)
            );
        });

        describe("joinVoice", () => {
            it("emite voice:join y actualiza el estado joining", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:join", {
                    roomId: "room-1",
                    userId: "user-123",
                });
                expect(result.current.joining).toBe(true);
            });

            it("no emite si ya está joining", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                mockSocket.emit.mockClear();

                act(() => {
                    result.current.joinVoice();
                });

                expect(mockSocket.emit).not.toHaveBeenCalled();
            });

            it("establece error si el socket no está conectado", () => {
                const mockSocket = createMockSocket();
                mockSocket.connected = false;

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.error).toBe(
                    "No hay conexión con el servidor"
                );
                expect(mockSocket.emit).not.toHaveBeenCalled();
            });
        });

        describe("leaveVoice", () => {
            it("emite voice:leave cuando está unido", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.joined).toBe(true);

                act(() => {
                    result.current.leaveVoice();
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:leave", {
                    roomId: "room-1",
                    userId: "user-123",
                });
                expect(result.current.joined).toBe(false);
            });

            it("no emite si no está unido", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.leaveVoice();
                });

                expect(mockSocket.emit).not.toHaveBeenCalled();
            });
        });

        describe("toggleMute", () => {
            it("emite voice:mute y actualiza el estado de muted", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: true },
                        ],
                    });
                });

                expect(result.current.muted).toBe(true);

                act(() => {
                    result.current.toggleMute();
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:mute", {
                    roomId: "room-1",
                    userId: "user-123",
                    muted: false,
                });
                expect(result.current.muted).toBe(false);
            });

            it("no emite si no está unido", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.toggleMute();
                });

                expect(mockSocket.emit).not.toHaveBeenCalled();
            });
        });

        describe("voice:state event", () => {
            it("actualiza participantes con isSelf correcto", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", displayName: "Test User", muted: false },
                            { userId: "user-456", displayName: "Other User", muted: true },
                        ],
                    });
                });

                expect(result.current.participants).toHaveLength(2);
                expect(result.current.participants[0]).toEqual({
                    userId: "user-123",
                    displayName: "Test User",
                    muted: false,
                    isSelf: true,
                });
                expect(result.current.participants[1]).toEqual({
                    userId: "user-456",
                    displayName: "Other User",
                    muted: true,
                    isSelf: false,
                });
            });

            it("actualiza joined basado en la presencia del usuario", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Usuario presente
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.joined).toBe(true);

                // Usuario ausente
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-456", muted: false },
                        ],
                    });
                });

                expect(result.current.joined).toBe(false);
            });

            it("sincroniza muted con el estado del servidor", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Usuario con muted: false
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.muted).toBe(false);

                // Usuario con muted: true
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: true },
                        ],
                    });
                });

                expect(result.current.muted).toBe(true);
            });

            it("limpia joining cuando el usuario aparece en participantes", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.joining).toBe(true);

                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: true },
                        ],
                    });
                });

                expect(result.current.joining).toBe(false);
            });
        });

        describe("voice:error event", () => {
            it("establece el mensaje de error y limpia joining", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                act(() => {
                    mockSocket._trigger("voice:error", {
                        message: "Room not found",
                    });
                });

                expect(result.current.error).toBe("Room not found");
                expect(result.current.joining).toBe(false);
            });
        });

        describe("cuando socket es null", () => {
            it("devuelve el estado por defecto", () => {
                const { result } = renderHook(() =>
                    useVoiceChat("room-1", null)
                );

                expect(result.current.participants).toEqual([]);
                expect(result.current.joined).toBe(false);
                expect(result.current.muted).toBe(true);
            });
        });

        describe("lifecycle y cleanup", () => {
            it("cancela el timeout de join cuando el componente se desmonta", () => {
                const mockSocket = createMockSocket();

                const { result, unmount } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Iniciar join
                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.joining).toBe(true);

                // Desmontar antes de que expire el timeout
                unmount();

                // Avanzar el tiempo más allá del timeout (10 segundos)
                act(() => {
                    jest.advanceTimersByTime(15000);
                });

                // No debería haber errores ya que el componente fue desmontado
                // y el timeout fue cancelado (no hay setState after unmount)
            });

            it("cancela el timeout de join cuando llega voice:state exitoso", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Iniciar join
                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.joining).toBe(true);

                // Simular respuesta exitosa del servidor
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.joining).toBe(false);
                expect(result.current.joined).toBe(true);

                // Avanzar el tiempo más allá del timeout
                act(() => {
                    jest.advanceTimersByTime(15000);
                });

                // El error no debería aparecer porque el timeout fue cancelado
                expect(result.current.error).toBeNull();
            });

            it("cancela el timeout de join cuando llega voice:error", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Iniciar join
                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.joining).toBe(true);

                // Simular error del servidor
                act(() => {
                    mockSocket._trigger("voice:error", {
                        message: "Room not found",
                    });
                });

                expect(result.current.joining).toBe(false);
                expect(result.current.error).toBe("Room not found");

                // Limpiar el error
                act(() => {
                    result.current.joinVoice();
                });

                // Avanzar el tiempo más allá del timeout original
                act(() => {
                    jest.advanceTimersByTime(15000);
                });

                // No debería haber duplicación de errores
            });

            it("limpia el estado cuando el socket cambia", () => {
                const mockSocket1 = createMockSocket();
                const mockSocket2 = createMockSocket();

                const { result, rerender } = renderHook(
                    ({ socket }) => useVoiceChat("room-1", socket as any),
                    { initialProps: { socket: mockSocket1 } }
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket1._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.joined).toBe(true);
                expect(result.current.participants).toHaveLength(1);

                // Cambiar el socket
                rerender({ socket: mockSocket2 });

                // El estado debería haberse limpiado
                expect(result.current.joined).toBe(false);
                expect(result.current.participants).toEqual([]);
            });

            it("limpia el estado cuando el roomId cambia", () => {
                const mockSocket = createMockSocket();

                const { result, rerender } = renderHook(
                    ({ roomId }) => useVoiceChat(roomId, mockSocket as any),
                    { initialProps: { roomId: "room-1" } }
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false },
                        ],
                    });
                });

                expect(result.current.joined).toBe(true);

                // Cambiar el roomId
                rerender({ roomId: "room-2" });

                // El estado debería haberse limpiado
                expect(result.current.joined).toBe(false);
                expect(result.current.participants).toEqual([]);
            });

            it("el timeout de join expira y establece error si no hay respuesta", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Iniciar join
                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.joining).toBe(true);
                expect(result.current.error).toBeNull();

                // Avanzar el tiempo hasta el timeout
                act(() => {
                    jest.advanceTimersByTime(10000);
                });

                // El timeout debería haber expirado
                expect(result.current.joining).toBe(false);
                expect(result.current.error).toBe("Tiempo de espera agotado al unirse");
            });
        });

        describe("serverMuted y role", () => {
            it("procesa serverMuted desde voice:state", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, serverMuted: true, role: "speaker" },
                        ],
                    });
                });

                expect(result.current.serverMuted).toBe(true);
                expect(result.current.selfRole).toBe("speaker");
                expect(result.current.participants[0].serverMuted).toBe(true);
                expect(result.current.participants[0].role).toBe("speaker");
            });

            it("no permite toggleMute cuando serverMuted es true", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido y serverMuted
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: true, serverMuted: true },
                        ],
                    });
                });

                expect(result.current.serverMuted).toBe(true);

                // Intentar toggleMute
                act(() => {
                    result.current.toggleMute();
                });

                // No debería haber emitido voice:mute
                expect(mockSocket.emit).not.toHaveBeenCalledWith("voice:mute", expect.anything());
            });
        });

        describe("voice:moderation event", () => {
            it("registra listener para voice:moderation", () => {
                const mockSocket = createMockSocket();

                renderHook(() => useVoiceChat("room-1", mockSocket as any));

                expect(mockSocket.on).toHaveBeenCalledWith(
                    "voice:moderation",
                    expect.any(Function)
                );
            });

            it("desregistra listener de voice:moderation al desmontar", () => {
                const mockSocket = createMockSocket();

                const { unmount } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                unmount();

                expect(mockSocket.off).toHaveBeenCalledWith(
                    "voice:moderation",
                    expect.any(Function)
                );
            });

            it("maneja SERVER_MUTE y actualiza serverMuted", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                expect(result.current.serverMuted).toBe(false);

                // Simular SERVER_MUTE
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "SERVER_MUTE",
                        roomId: "room-1",
                    });
                });

                expect(result.current.serverMuted).toBe(true);
                expect(result.current.error).toBe("Has sido silenciado por el host");
            });

            it("maneja SERVER_UNMUTE y actualiza serverMuted", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido y serverMuted
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false, serverMuted: true }],
                    });
                });

                expect(result.current.serverMuted).toBe(true);

                // Simular SERVER_UNMUTE
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "SERVER_UNMUTE",
                        roomId: "room-1",
                    });
                });

                expect(result.current.serverMuted).toBe(false);
                expect(result.current.error).toBeNull();
            });

            it("maneja KICK y sale del canal de voz", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                expect(result.current.joined).toBe(true);

                // Simular KICK
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "KICK",
                        roomId: "room-1",
                        reason: "Comportamiento inapropiado",
                    });
                });

                expect(result.current.joined).toBe(false);
                expect(result.current.error).toBe("Comportamiento inapropiado");
            });

            it("KICK usa mensaje por defecto si no hay reason", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                // Simular KICK sin reason
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "KICK",
                        roomId: "room-1",
                    });
                });

                expect(result.current.error).toBe("Has sido expulsado del chat de voz");
            });
        });

        describe("hostMute", () => {
            it("emite voice:host-mute si el usuario es host", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como host
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "host" },
                            { userId: "user-456", muted: false, role: "speaker" },
                        ],
                    });
                });

                expect(result.current.selfRole).toBe("host");

                // Llamar hostMute
                act(() => {
                    result.current.hostMute("user-456");
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:host-mute", {
                    roomId: "room-1",
                    targetUserId: "user-456",
                });
            });

            it("no emite si el usuario no es host ni cohost", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como speaker
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "speaker" },
                        ],
                    });
                });

                expect(result.current.selfRole).toBe("speaker");

                // Intentar hostMute
                act(() => {
                    result.current.hostMute("user-456");
                });

                expect(mockSocket.emit).not.toHaveBeenCalledWith(
                    "voice:host-mute",
                    expect.anything()
                );
            });

            it("emite si el usuario es cohost", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como cohost
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "cohost" },
                        ],
                    });
                });

                expect(result.current.selfRole).toBe("cohost");

                // Llamar hostMute
                act(() => {
                    result.current.hostMute("user-456");
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:host-mute", {
                    roomId: "room-1",
                    targetUserId: "user-456",
                });
            });
        });

        describe("hostUnmute", () => {
            it("emite voice:host-unmute si el usuario es host", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como host
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "host" },
                        ],
                    });
                });

                // Llamar hostUnmute
                act(() => {
                    result.current.hostUnmute("user-456");
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:host-unmute", {
                    roomId: "room-1",
                    targetUserId: "user-456",
                });
            });

            it("no emite si el usuario no es host ni cohost", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como listener
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "listener" },
                        ],
                    });
                });

                // Intentar hostUnmute
                act(() => {
                    result.current.hostUnmute("user-456");
                });

                expect(mockSocket.emit).not.toHaveBeenCalledWith(
                    "voice:host-unmute",
                    expect.anything()
                );
            });
        });

        describe("hostKick", () => {
            it("emite voice:host-kick si el usuario es host", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como host
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "host" },
                        ],
                    });
                });

                // Llamar hostKick
                act(() => {
                    result.current.hostKick("user-456");
                });

                expect(mockSocket.emit).toHaveBeenCalledWith("voice:host-kick", {
                    roomId: "room-1",
                    targetUserId: "user-456",
                });
            });

            it("no emite si el usuario no es host ni cohost", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que el usuario está unido como speaker
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [
                            { userId: "user-123", muted: false, role: "speaker" },
                        ],
                    });
                });

                // Intentar hostKick
                act(() => {
                    result.current.hostKick("user-456");
                });

                expect(mockSocket.emit).not.toHaveBeenCalledWith(
                    "voice:host-kick",
                    expect.anything()
                );
            });
        });

        describe("voiceError (VoiceErrorState)", () => {
            it("inicializa con voiceError vacío", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                expect(result.current.voiceError).toEqual({
                    code: null,
                    message: null,
                    uiMessage: null,
                    retryable: false,
                });
            });

            it("establece VOICE_UNAVAILABLE cuando el socket no está conectado al hacer join", () => {
                const mockSocket = createMockSocket();
                mockSocket.connected = false;

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.voiceError.code).toBe("VOICE_UNAVAILABLE");
                expect(result.current.voiceError.retryable).toBe(true);
                expect(result.current.error).toBe("No hay conexión con el servidor");
            });

            it("establece VOICE_JOIN_TIMEOUT cuando expira el timeout de join", async () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                // Avanzar el tiempo para que expire el timeout
                act(() => {
                    jest.advanceTimersByTime(10000);
                });

                expect(result.current.voiceError.code).toBe("VOICE_JOIN_TIMEOUT");
                expect(result.current.voiceError.retryable).toBe(true);
            });

            it("establece VOICE_SERVER_MUTED cuando recibe SERVER_MUTE", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                // Simular moderación de SERVER_MUTE
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "SERVER_MUTE",
                        roomId: "room-1",
                    });
                });

                expect(result.current.voiceError.code).toBe("VOICE_SERVER_MUTED");
                expect(result.current.voiceError.retryable).toBe(false);
            });

            it("limpia voiceError cuando recibe SERVER_UNMUTE", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                // Establecer SERVER_MUTE primero
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "SERVER_MUTE",
                        roomId: "room-1",
                    });
                });

                expect(result.current.voiceError.code).toBe("VOICE_SERVER_MUTED");

                // Ahora SERVER_UNMUTE
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "SERVER_UNMUTE",
                        roomId: "room-1",
                    });
                });

                expect(result.current.voiceError.code).toBe(null);
            });

            it("establece VOICE_KICKED cuando recibe KICK", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular que está unido
                act(() => {
                    mockSocket._trigger("voice:state", {
                        participants: [{ userId: "user-123", muted: false }],
                    });
                });

                // Simular KICK
                act(() => {
                    mockSocket._trigger("voice:moderation", {
                        type: "KICK",
                        roomId: "room-1",
                        reason: "Comportamiento inapropiado",
                    });
                });

                expect(result.current.voiceError.code).toBe("VOICE_KICKED");
                expect(result.current.voiceError.retryable).toBe(false);
                expect(result.current.voiceError.uiMessage).toBe("Comportamiento inapropiado");
            });

            it("limpia voiceError al llamar joinVoice exitosamente", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Simular error previo
                mockSocket.connected = false;
                act(() => {
                    result.current.joinVoice();
                });
                expect(result.current.voiceError.code).toBe("VOICE_UNAVAILABLE");

                // Reconectar socket y hacer join
                mockSocket.connected = true;
                act(() => {
                    result.current.joinVoice();
                });

                expect(result.current.voiceError.code).toBe(null);
            });

            it("clearError limpia voiceError manualmente", () => {
                const mockSocket = createMockSocket();
                mockSocket.connected = false;

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                // Establecer un error
                act(() => {
                    result.current.joinVoice();
                });
                expect(result.current.voiceError.code).toBe("VOICE_UNAVAILABLE");

                // Limpiar el error
                act(() => {
                    result.current.clearError();
                });

                expect(result.current.voiceError.code).toBe(null);
            });

            it("mapea errores del servidor con código SERVICE_UNAVAILABLE", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    mockSocket._trigger("voice:error", {
                        message: "Servicio no disponible",
                    });
                });

                expect(result.current.voiceError.code).toBe("VOICE_SERVICE_UNAVAILABLE");
                expect(result.current.voiceError.retryable).toBe(true);
            });

            it("mapea errores del servidor con código VOICE_INVALID_USER_ID cuando viene del backend", () => {
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    mockSocket._trigger("voice:error", {
                        message: "Invalid userId",
                        code: "VOICE_INVALID_USER_ID",
                    });
                });

                expect(result.current.voiceError.code).toBe("VOICE_INVALID_USER_ID");
                expect(result.current.voiceError.retryable).toBe(false);
                expect(result.current.voiceError.uiMessage).toBe("Debes iniciar sesión para unirte al chat de voz");
            });

            it("establece VOICE_INVALID_USER_ID si el usuario no está autenticado al hacer joinVoice", () => {
                // Simular usuario no autenticado
                mockUseAuth.mockReturnValue({ user: null });
                const mockSocket = createMockSocket();

                const { result } = renderHook(() =>
                    useVoiceChat("room-1", mockSocket as any)
                );

                act(() => {
                    result.current.joinVoice();
                });

                expect(mockSocket.emit).not.toHaveBeenCalled();
                expect(result.current.voiceError.code).toBe("VOICE_INVALID_USER_ID");
                expect(result.current.voiceError.retryable).toBe(false);
                expect(result.current.voiceError.uiMessage).toBe("Debes iniciar sesión para unirte al chat de voz");
            });
        });
    });
});
