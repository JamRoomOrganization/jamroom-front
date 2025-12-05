/**
 * Tests para VoiceControls component con integración de media.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { VoiceControls } from "./VoiceControls";

// Mock de useVoiceMedia ya no se necesita - las props vienen del padre

describe("VoiceControls", () => {
    const originalEnv = process.env;

    const mockEnableMedia = jest.fn();
    const mockDisableMedia = jest.fn();

    const defaultProps = {
        participants: [],
        joined: false,
        muted: true,
        joining: false,
        error: null,
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onToggleMute: jest.fn(),
        enableVoice: true,
        enableVoiceMedia: false,
        mediaEnabled: false,
        mediaPermissionState: "idle" as const,
        mediaError: null as string | null,
        onEnableMedia: mockEnableMedia,
        onDisableMedia: mockDisableMedia,
        livekitConnected: false,
        livekitConnecting: false,
        livekitReconnecting: false,
        livekitError: null,
        onLivekitRetry: jest.fn(),
    };

    beforeEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
        mockEnableMedia.mockReset();
        mockDisableMedia.mockReset();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("cuando enableVoiceMedia es false", () => {
        it("renderiza normalmente sin solicitar permisos de media", () => {
            render(<VoiceControls {...defaultProps} enableVoiceMedia={false} />);

            expect(screen.getByText("Canal de voz")).toBeInTheDocument();
            expect(screen.getByText("Unirme al canal de voz")).toBeInTheDocument();
        });

        it("llama a onJoin directamente al hacer clic en unirse", async () => {
            const onJoin = jest.fn();
            render(<VoiceControls {...defaultProps} enableVoiceMedia={false} onJoin={onJoin} />);

            const joinButton = screen.getByText("Unirme al canal de voz");
            fireEvent.click(joinButton);

            // Sin media habilitada, debería llamar onJoin directamente
            await waitFor(() => {
                expect(onJoin).toHaveBeenCalled();
            });
        });

        it("llama a onLeave al hacer clic en salir", () => {
            const onLeave = jest.fn();
            render(<VoiceControls {...defaultProps} enableVoiceMedia={false} joined={true} onLeave={onLeave} />);

            const leaveButton = screen.getByTitle("Salir del canal de voz");
            fireEvent.click(leaveButton);

            expect(onLeave).toHaveBeenCalled();
        });
    });

    describe("cuando enableVoiceMedia es true", () => {
        describe("cuando permisos denegados", () => {
            it("muestra mensaje de error cuando mediaError está presente", () => {
                render(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        mediaPermissionState="denied"
                        mediaError="Permiso de micrófono denegado."
                    />
                );

                expect(screen.getByText("Permiso de micrófono denegado.")).toBeInTheDocument();
            });

            it("no llama a onJoin si los permisos son denegados", async () => {
                const onJoin = jest.fn();
                const onEnableMedia = jest.fn().mockResolvedValue(undefined);

                const { rerender } = render(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        onEnableMedia={onEnableMedia}
                        onJoin={onJoin}
                    />
                );

                const joinButton = screen.getByText("Unirme al canal de voz");
                await act(async () => {
                    fireEvent.click(joinButton);
                });

                // Debe haber llamado a onEnableMedia
                expect(onEnableMedia).toHaveBeenCalled();

                // Simular que el permiso fue denegado (re-render con nuevas props)
                rerender(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        mediaPermissionState="denied"
                        mediaError="Permiso denegado"
                        onEnableMedia={onEnableMedia}
                        onJoin={onJoin}
                    />
                );

                // NO debe llamar a onJoin porque el permiso fue denegado
                expect(onJoin).not.toHaveBeenCalled();
            });
        });

        describe("cuando permisos concedidos", () => {
            it("llama a onEnableMedia al hacer clic en unirse", async () => {
                const onJoin = jest.fn();
                const onEnableMedia = jest.fn().mockResolvedValue(undefined);

                render(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        onEnableMedia={onEnableMedia}
                        onJoin={onJoin}
                    />
                );

                const joinButton = screen.getByText("Unirme al canal de voz");
                await act(async () => {
                    fireEvent.click(joinButton);
                });

                // Debe haber llamado a onEnableMedia
                expect(onEnableMedia).toHaveBeenCalled();
            });

            it("llama a onJoin cuando ya tiene permisos", async () => {
                const onJoin = jest.fn();

                render(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        mediaPermissionState="granted"
                        mediaEnabled={true}
                        onJoin={onJoin}
                    />
                );

                const joinButton = screen.getByText("Unirme al canal de voz");
                await act(async () => {
                    fireEvent.click(joinButton);
                });

                // Con permisos ya concedidos, debe llamar onJoin después del effect
                await waitFor(() => {
                    expect(onJoin).toHaveBeenCalled();
                });
            });
        });

        describe("cuando el usuario sale del canal", () => {
            it("llama a onDisableMedia y onLeave", () => {
                const onLeave = jest.fn();
                const onDisableMedia = jest.fn();

                render(
                    <VoiceControls
                        {...defaultProps}
                        enableVoiceMedia={true}
                        mediaPermissionState="granted"
                        mediaEnabled={true}
                        onDisableMedia={onDisableMedia}
                        joined={true}
                        onLeave={onLeave}
                    />
                );

                const leaveButton = screen.getByTitle("Salir del canal de voz");
                fireEvent.click(leaveButton);

                // Debe llamar a onDisableMedia para apagar el micrófono
                expect(onDisableMedia).toHaveBeenCalled();
                // Y también llamar a onLeave para la señalización
                expect(onLeave).toHaveBeenCalled();
            });
        });
    });

    describe("renderizado básico", () => {
        it("no renderiza nada cuando enableVoice es false", () => {
            const { container } = render(
                <VoiceControls {...defaultProps} enableVoice={false} />
            );

            expect(container.firstChild).toBeNull();
        });

        it("renderiza el componente cuando enableVoice es true", () => {
            render(<VoiceControls {...defaultProps} enableVoice={true} />);

            expect(screen.getByText("Canal de voz")).toBeInTheDocument();
        });

        it("muestra el estado de conexión cuando joining es true", () => {
            render(<VoiceControls {...defaultProps} joining={true} />);

            expect(screen.getByText(/Conectando al canal de voz/i)).toBeInTheDocument();
        });


        it("muestra la lista de participantes cuando joined es true", () => {
            const participants = [
                { userId: "1", displayName: "Alice", muted: false, isSelf: true },
                { userId: "2", displayName: "Bob", muted: true, isSelf: false },
            ];

            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    participants={participants}
                />
            );

            expect(screen.getByText("Alice")).toBeInTheDocument();
            expect(screen.getByText("Bob")).toBeInTheDocument();
        });

        it("muestra error de signaling cuando hay error en props", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    error="Error de conexión al servidor"
                />
            );

            expect(screen.getByText("Error de conexión al servidor")).toBeInTheDocument();
        });
    });

    describe("estados de reconexión LiveKit", () => {
        it("muestra banner de reconexión cuando livekitReconnecting es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitReconnecting={true}
                />
            );

            expect(screen.getByText("Reconectando al canal de voz...")).toBeInTheDocument();
        });

        it("muestra indicador de estado 'Reconectando...' en el header", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitReconnecting={true}
                />
            );

            expect(screen.getByText("Reconectando...")).toBeInTheDocument();
        });

        it("muestra indicador 'En vivo' cuando livekitConnected es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitConnected={true}
                />
            );

            expect(screen.getByText("En vivo")).toBeInTheDocument();
        });

        it("muestra indicador 'Conectando...' cuando livekitConnecting es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitConnecting={true}
                />
            );

            expect(screen.getByText("Conectando...")).toBeInTheDocument();
        });

        it("muestra botón de reintento cuando hay error de LiveKit mientras está unido", () => {
            const onLivekitRetry = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitError="Error de conexión"
                    onLivekitRetry={onLivekitRetry}
                />
            );

            expect(screen.getByText("Reintentar conexión")).toBeInTheDocument();
        });

        it("llama a onLivekitRetry cuando se hace clic en reintentar (estando unido)", () => {
            const onLivekitRetry = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitError="Error de conexión"
                    onLivekitRetry={onLivekitRetry}
                />
            );

            const retryButton = screen.getByText("Reintentar conexión");
            fireEvent.click(retryButton);

            expect(onLivekitRetry).toHaveBeenCalled();
        });

        it("no muestra banner de reconexión si hay error", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitReconnecting={true}
                    livekitError="Error de conexión"
                />
            );

            // El banner de reconexión no debe mostrarse si hay error
            expect(screen.queryByText("Reconectando al canal de voz...")).not.toBeInTheDocument();
            // Pero el error sí debe mostrarse
            expect(screen.getByText("Error de conexión")).toBeInTheDocument();
        });

        it("muestra mensaje de estado apropiado durante la conexión", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={false}
                    livekitConnecting={true}
                />
            );

            expect(screen.getByText("Conectando al servidor de audio...")).toBeInTheDocument();
        });

        it("deshabilita el botón de reintentar mientras reconecta", () => {
            const onLivekitRetry = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitError="Error de conexión"
                    livekitReconnecting={true}
                    onLivekitRetry={onLivekitRetry}
                />
            );

            const retryButton = screen.getByText("Reintentar conexión");
            expect(retryButton).toBeDisabled();
        });
    });

    describe("serverMuted UI", () => {
        it("muestra banner de silenciado por el host cuando serverMuted es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={true}
                />
            );

            expect(screen.getByText(/Has sido silenciado por el host/)).toBeInTheDocument();
        });

        it("deshabilita el botón de mute cuando serverMuted es true", () => {
            const onToggleMute = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={true}
                    onToggleMute={onToggleMute}
                />
            );

            // Buscar el botón de mute por su título
            const muteButton = screen.getByTitle("Silenciado por el host");
            expect(muteButton).toBeDisabled();
        });

        it("no llama a onToggleMute cuando serverMuted es true y se hace clic", () => {
            const onToggleMute = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={true}
                    onToggleMute={onToggleMute}
                />
            );

            const muteButton = screen.getByTitle("Silenciado por el host");
            fireEvent.click(muteButton);

            expect(onToggleMute).not.toHaveBeenCalled();
        });

        it("muestra el texto 'Silenciado' en el botón cuando serverMuted es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={true}
                />
            );

            expect(screen.getByText("Silenciado")).toBeInTheDocument();
        });

        it("aplica estilos de deshabilitado al botón de mute cuando serverMuted es true", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={true}
                />
            );

            const muteButton = screen.getByTitle("Silenciado por el host");
            expect(muteButton).toHaveClass("cursor-not-allowed");
        });

        it("muestra icono de serverMuted para participantes silenciados por el servidor", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    participants={[
                        { userId: "user-1", displayName: "User 1", muted: false, serverMuted: true, isSelf: false },
                    ]}
                />
            );

            // El título del indicador debería decir "Silenciado por el host"
            expect(screen.getByTitle("Silenciado por el host")).toBeInTheDocument();
        });

        it("muestra icono de muted normal para participantes auto-silenciados", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    participants={[
                        { userId: "user-1", displayName: "User 1", muted: true, serverMuted: false, isSelf: false },
                    ]}
                />
            );

            expect(screen.getByTitle("Micrófono silenciado")).toBeInTheDocument();
        });

        it("muestra icono de mic activo para participantes no silenciados", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    participants={[
                        { userId: "user-1", displayName: "User 1", muted: false, serverMuted: false, isSelf: false },
                    ]}
                />
            );

            expect(screen.getByTitle("Micrófono activo")).toBeInTheDocument();
        });

        it("no muestra banner de serverMuted cuando serverMuted es false", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    serverMuted={false}
                />
            );

            expect(screen.queryByText(/Has sido silenciado por el host/)).not.toBeInTheDocument();
        });

        it("permite toggle mute cuando serverMuted es false", () => {
            const onToggleMute = jest.fn();
            
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    muted={true}
                    serverMuted={false}
                    onToggleMute={onToggleMute}
                />
            );

            const muteButton = screen.getByTitle("Activar micrófono");
            expect(muteButton).not.toBeDisabled();
            
            fireEvent.click(muteButton);
            expect(onToggleMute).toHaveBeenCalled();
        });
    });

    describe("consolidated error states (VoiceErrorState)", () => {
        it("muestra error de voiceError con prioridad sobre livekitError", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_UNAVAILABLE",
                        message: "Socket not connected",
                        uiMessage: "No hay conexión con el servidor",
                        retryable: true,
                    }}
                    livekitError="Error de LiveKit"
                />
            );

            expect(screen.getByText("No hay conexión con el servidor")).toBeInTheDocument();
            expect(screen.queryByText("Error de LiveKit")).not.toBeInTheDocument();
        });

        it("muestra error de livekitErrorState cuando no hay voiceError", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitErrorState={{
                        type: "CONNECTION_FAILED",
                        message: "No se pudo conectar al servidor de voz",
                        retryable: true,
                    }}
                />
            );

            expect(screen.getByText("No se pudo conectar al servidor de voz")).toBeInTheDocument();
        });

        it("muestra botón de reintentar cuando el error es retryable", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_JOIN_TIMEOUT",
                        message: "Timeout",
                        uiMessage: "Tiempo de espera agotado",
                        retryable: true,
                    }}
                />
            );

            expect(screen.getByText("Reintentar conexión")).toBeInTheDocument();
        });

        it("no muestra botón de reintentar cuando el error no es retryable", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_KICKED",
                        message: "Kicked",
                        uiMessage: "Has sido expulsado del chat de voz",
                        retryable: false,
                    }}
                />
            );

            expect(screen.queryByText("Reintentar conexión")).not.toBeInTheDocument();
        });

        it("muestra estilo de moderación para errores de moderación", () => {
            const { container } = render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_SERVER_MUTED",
                        message: "Server muted",
                        uiMessage: "Has sido silenciado por el host",
                        retryable: false,
                    }}
                />
            );

            // Buscar el contenedor con estilo de moderación (naranja en lugar de rojo)
            const errorBanner = container.querySelector(".bg-orange-500\\/10");
            expect(errorBanner).toBeInTheDocument();
        });

        it("deshabilita el botón de unirse cuando VOICE_UNAVAILABLE", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_UNAVAILABLE",
                        message: "Socket not connected",
                        uiMessage: "No hay conexión con el servidor",
                        retryable: true,
                    }}
                />
            );

            const joinButton = screen.getByText("Unirme al canal de voz");
            expect(joinButton).toBeDisabled();
        });

        it("deshabilita el botón de unirse cuando VOICE_SERVICE_UNAVAILABLE", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_SERVICE_UNAVAILABLE",
                        message: "Service unavailable",
                        uiMessage: "El servicio de voz no está disponible",
                        retryable: true,
                    }}
                />
            );

            const joinButton = screen.getByText("Unirme al canal de voz");
            expect(joinButton).toBeDisabled();
        });

        it("muestra mensaje alternativo cuando el servicio de voz no está disponible", () => {
            render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_SERVICE_UNAVAILABLE",
                        message: "Service unavailable",
                        uiMessage: "El servicio de voz no está disponible",
                        retryable: true,
                    }}
                />
            );

            expect(screen.getByText("El canal de voz no está disponible en este momento.")).toBeInTheDocument();
        });

        it("llama a onClearError y luego onLivekitRetry al hacer clic en reintentar (error LiveKit)", async () => {
            const onClearError = jest.fn();
            const onLivekitRetry = jest.fn();

            render(
                <VoiceControls
                    {...defaultProps}
                    joined={true}
                    livekitErrorState={{
                        type: "CONNECTION_FAILED",
                        message: "Error de conexión",
                        retryable: true,
                    }}
                    onClearError={onClearError}
                    onLivekitRetry={onLivekitRetry}
                />
            );

            const retryButton = screen.getByText("Reintentar conexión");
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(onLivekitRetry).toHaveBeenCalled();
            });
        });

        it("prioriza correctamente: VOICE_UNAVAILABLE > VOICE_SERVICE_UNAVAILABLE > LiveKit", () => {
            // Con VOICE_UNAVAILABLE, debe mostrar ese error
            const { rerender } = render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_UNAVAILABLE",
                        message: "Socket not connected",
                        uiMessage: "Error de conexión",
                        retryable: true,
                    }}
                    livekitErrorState={{
                        type: "CONNECTION_FAILED",
                        message: "LiveKit error",
                        retryable: true,
                    }}
                />
            );

            expect(screen.getByText("Error de conexión")).toBeInTheDocument();
            expect(screen.queryByText("LiveKit error")).not.toBeInTheDocument();

            // Con solo VOICE_SERVICE_UNAVAILABLE
            rerender(
                <VoiceControls
                    {...defaultProps}
                    voiceError={{
                        code: "VOICE_SERVICE_UNAVAILABLE",
                        message: "Service unavailable",
                        uiMessage: "Servicio no disponible",
                        retryable: true,
                    }}
                    livekitErrorState={{
                        type: "CONNECTION_FAILED",
                        message: "LiveKit error",
                        retryable: true,
                    }}
                />
            );

            expect(screen.getByText("Servicio no disponible")).toBeInTheDocument();
            expect(screen.queryByText("LiveKit error")).not.toBeInTheDocument();
        });

        it("no muestra error consolidado cuando no hay errores", () => {
            const { container } = render(
                <VoiceControls
                    {...defaultProps}
                    voiceError={null}
                    livekitErrorState={null}
                    livekitError={null}
                    error={null}
                />
            );

            // No debe haber banners de error
            expect(container.querySelector(".bg-red-500\\/10")).not.toBeInTheDocument();
            expect(container.querySelector(".bg-orange-500\\/10")).not.toBeInTheDocument();
        });
    });
});
