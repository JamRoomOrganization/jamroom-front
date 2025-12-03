/**
 * Tests para useVoiceMedia hook.
 */

import { renderHook, act } from "@testing-library/react";
import { useVoiceMedia } from "./useVoiceMedia";

// Mock de navigator.mediaDevices
const mockGetUserMedia = jest.fn();

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
    };

    const mockStream = {
        getTracks: jest.fn(() => [mockTrack]),
        getAudioTracks: jest.fn(() => [mockTrack]),
        getVideoTracks: jest.fn(() => []),
        id: "mock-stream-id",
        active: true,
        addTrack: jest.fn(),
        removeTrack: jest.fn(),
        clone: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    };

    return mockStream as unknown as MediaStream;
}

describe("useVoiceMedia", () => {
    const originalEnv = process.env;
    const originalMediaDevices = navigator.mediaDevices;

    beforeEach(() => {
        // Setup environment BEFORE resetting modules
        process.env = { ...originalEnv };

        // Setup mock para navigator.mediaDevices
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: mockGetUserMedia,
            },
            writable: true,
            configurable: true,
        });

        mockGetUserMedia.mockReset();
    });

    afterEach(() => {
        process.env = originalEnv;
        Object.defineProperty(navigator, "mediaDevices", {
            value: originalMediaDevices,
            writable: true,
            configurable: true,
        });
        jest.clearAllMocks();
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE_MEDIA está deshabilitada", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA = "false";
        });

        it("devuelve un resultado no-op", () => {
            const { result } = renderHook(() => useVoiceMedia());

            expect(result.current.localStream).toBeNull();
            expect(result.current.mediaEnabled).toBe(false);
            expect(result.current.permissionState).toBe("idle");
            expect(result.current.error).toBeNull();
        });

        it("enableMedia es no-op", async () => {
            const { result } = renderHook(() => useVoiceMedia());

            await act(async () => {
                await result.current.enableMedia();
            });

            expect(mockGetUserMedia).not.toHaveBeenCalled();
            expect(result.current.mediaEnabled).toBe(false);
            expect(result.current.permissionState).toBe("idle");
        });

        it("disableMedia es no-op", () => {
            const { result } = renderHook(() => useVoiceMedia());

            act(() => {
                result.current.disableMedia();
            });

            expect(result.current.mediaEnabled).toBe(false);
        });
    });

    describe("cuando enabledFlag override es false", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA = "true";
        });

        it("devuelve un resultado no-op cuando enabledFlag es false", () => {
            const { result } = renderHook(() =>
                useVoiceMedia({ enabledFlag: false })
            );

            expect(result.current.localStream).toBeNull();
            expect(result.current.mediaEnabled).toBe(false);
            expect(result.current.permissionState).toBe("idle");
        });
    });

    describe("cuando la feature está habilitada via enabledFlag", () => {
        // Usamos enabledFlag: true para tener control directo sobre la feature flag
        // y evitar problemas con process.env en tests

        it("inicializa con estado por defecto", () => {
            const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

            expect(result.current.localStream).toBeNull();
            expect(result.current.mediaEnabled).toBe(false);
            expect(result.current.permissionState).toBe("idle");
            expect(result.current.error).toBeNull();
        });

        describe("enableMedia", () => {
            it("solicita permisos y obtiene el stream exitosamente", async () => {
                const mockStream = createMockMediaStream();
                mockGetUserMedia.mockResolvedValueOnce(mockStream);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
                expect(result.current.localStream).toBe(mockStream);
                expect(result.current.mediaEnabled).toBe(true);
                expect(result.current.permissionState).toBe("granted");
                expect(result.current.error).toBeNull();
            });

            it("cambia a estado 'prompt' mientras solicita permisos", async () => {
                let resolveGetUserMedia: (stream: MediaStream) => void;
                const pendingPromise = new Promise<MediaStream>((resolve) => {
                    resolveGetUserMedia = resolve;
                });

                mockGetUserMedia.mockReturnValueOnce(pendingPromise);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Iniciar la solicitud sin esperar
                let enablePromise: Promise<void>;
                act(() => {
                    enablePromise = result.current.enableMedia();
                });

                // Verificar estado intermedio
                expect(result.current.permissionState).toBe("prompt");

                // Resolver la promesa
                const mockStream = createMockMediaStream();
                await act(async () => {
                    resolveGetUserMedia!(mockStream);
                    await enablePromise;
                });

                expect(result.current.permissionState).toBe("granted");
            });

            it("maneja error de permisos denegados (NotAllowedError)", async () => {
                const notAllowedError = new DOMException(
                    "Permission denied",
                    "NotAllowedError"
                );
                mockGetUserMedia.mockRejectedValueOnce(notAllowedError);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.localStream).toBeNull();
                expect(result.current.mediaEnabled).toBe(false);
                expect(result.current.permissionState).toBe("denied");
                expect(result.current.error).toContain("Permiso de micrófono denegado");
            });

            it("maneja error de permisos denegados (PermissionDeniedError)", async () => {
                const permissionDeniedError = new DOMException(
                    "Permission denied",
                    "PermissionDeniedError"
                );
                mockGetUserMedia.mockRejectedValueOnce(permissionDeniedError);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.permissionState).toBe("denied");
                expect(result.current.error).toContain("Permiso de micrófono denegado");
            });

            it("maneja error de dispositivo no encontrado (NotFoundError)", async () => {
                const notFoundError = new DOMException(
                    "Device not found",
                    "NotFoundError"
                );
                mockGetUserMedia.mockRejectedValueOnce(notFoundError);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.permissionState).toBe("error");
                expect(result.current.error).toContain("No se encontró ningún micrófono");
            });

            it("maneja error de dispositivo en uso (NotReadableError)", async () => {
                const notReadableError = new DOMException(
                    "Device in use",
                    "NotReadableError"
                );
                mockGetUserMedia.mockRejectedValueOnce(notReadableError);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.permissionState).toBe("error");
                expect(result.current.error).toContain("No se pudo acceder al micrófono");
            });

            it("no hace nada si ya está habilitado", async () => {
                const mockStream = createMockMediaStream();
                mockGetUserMedia.mockResolvedValue(mockStream);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Primera llamada
                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

                // Segunda llamada - no debería llamar de nuevo
                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
            });
        });

        describe("disableMedia", () => {
            it("para las pistas y limpia el stream", async () => {
                const mockStream = createMockMediaStream();
                const mockTrack = mockStream.getTracks()[0];
                mockGetUserMedia.mockResolvedValueOnce(mockStream);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Primero habilitamos
                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.mediaEnabled).toBe(true);
                expect(result.current.localStream).toBe(mockStream);

                // Luego deshabilitamos
                act(() => {
                    result.current.disableMedia();
                });

                expect(mockTrack.stop).toHaveBeenCalled();
                expect(result.current.localStream).toBeNull();
                expect(result.current.mediaEnabled).toBe(false);
            });

            it("limpia el error cuando se deshabilita", async () => {
                const notAllowedError = new DOMException(
                    "Permission denied",
                    "NotAllowedError"
                );
                mockGetUserMedia.mockRejectedValueOnce(notAllowedError);

                const { result } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Provocar un error
                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.error).not.toBeNull();

                // Deshabilitar
                act(() => {
                    result.current.disableMedia();
                });

                expect(result.current.error).toBeNull();
            });
        });

        describe("cleanup en unmount", () => {
            it("para las pistas cuando el componente se desmonta", async () => {
                const mockStream = createMockMediaStream();
                const mockTrack = mockStream.getTracks()[0];
                mockGetUserMedia.mockResolvedValueOnce(mockStream);

                const { result, unmount } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Habilitamos
                await act(async () => {
                    await result.current.enableMedia();
                });

                expect(result.current.mediaEnabled).toBe(true);

                // Desmontamos
                unmount();

                // Las pistas deben haberse detenido
                expect(mockTrack.stop).toHaveBeenCalled();
            });

            it("para el stream si getUserMedia completa después del unmount", async () => {
                const mockStream = createMockMediaStream();
                const mockTrack = mockStream.getTracks()[0];

                let resolveGetUserMedia: (stream: MediaStream) => void;
                const pendingPromise = new Promise<MediaStream>((resolve) => {
                    resolveGetUserMedia = resolve;
                });
                mockGetUserMedia.mockReturnValueOnce(pendingPromise);

                const { result, unmount } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Iniciar la solicitud
                let enablePromise: Promise<void>;
                act(() => {
                    enablePromise = result.current.enableMedia();
                });

                // Desmontar antes de que se resuelva
                unmount();

                // Resolver después del unmount
                await act(async () => {
                    resolveGetUserMedia!(mockStream);
                    await enablePromise!;
                });

                // El stream debe haberse detenido porque el componente ya no está montado
                expect(mockTrack.stop).toHaveBeenCalled();
            });
        });

        describe("race conditions", () => {
            it("no actualiza estado si el componente se desmonta durante enableMedia", async () => {
                const mockStream = createMockMediaStream();

                let resolveGetUserMedia: (stream: MediaStream) => void;
                const pendingPromise = new Promise<MediaStream>((resolve) => {
                    resolveGetUserMedia = resolve;
                });
                mockGetUserMedia.mockReturnValueOnce(pendingPromise);

                const { result, unmount } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Iniciar enableMedia
                let enablePromise: Promise<void>;
                act(() => {
                    enablePromise = result.current.enableMedia();
                });

                // Desmontar inmediatamente
                unmount();

                // Resolver la promesa
                await act(async () => {
                    resolveGetUserMedia!(mockStream);
                    await enablePromise!;
                });

                // No debería haber errores de setState después de unmount
                // (si los hubiera, el test fallaría con un warning de React)
            });

            it("no actualiza estado si el componente se desmonta durante error", async () => {
                const notAllowedError = new DOMException(
                    "Permission denied",
                    "NotAllowedError"
                );

                let rejectGetUserMedia: (error: Error) => void;
                const pendingPromise = new Promise<MediaStream>((_, reject) => {
                    rejectGetUserMedia = reject;
                });
                mockGetUserMedia.mockReturnValueOnce(pendingPromise);

                const { result, unmount } = renderHook(() => useVoiceMedia({ enabledFlag: true }));

                // Iniciar enableMedia
                let enablePromise: Promise<void>;
                act(() => {
                    enablePromise = result.current.enableMedia();
                });

                // Desmontar inmediatamente
                unmount();

                // Rechazar la promesa
                await act(async () => {
                    rejectGetUserMedia!(notAllowedError);
                    await enablePromise!;
                });

                // No debería haber errores de setState después de unmount
            });
        });
    });

    describe("cuando enabledFlag override es true con env var false", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA = "false";
        });

        it("activa la feature aunque la env var esté en false", async () => {
            const mockStream = createMockMediaStream();
            mockGetUserMedia.mockResolvedValueOnce(mockStream);

            const { result } = renderHook(() =>
                useVoiceMedia({ enabledFlag: true })
            );

            await act(async () => {
                await result.current.enableMedia();
            });

            expect(mockGetUserMedia).toHaveBeenCalled();
            expect(result.current.mediaEnabled).toBe(true);
        });
    });

    describe("cuando NEXT_PUBLIC_ENABLE_VOICE_MEDIA es true (sin override)", () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA = "true";
        });

        it("activa la feature desde la env var", async () => {
            const mockStream = createMockMediaStream();
            mockGetUserMedia.mockResolvedValueOnce(mockStream);

            const { result } = renderHook(() => useVoiceMedia());

            await act(async () => {
                await result.current.enableMedia();
            });

            expect(mockGetUserMedia).toHaveBeenCalled();
            expect(result.current.mediaEnabled).toBe(true);
        });
    });
});
