"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import type { VoiceParticipant, VoiceErrorState } from "@/hooks/useVoiceChat";
import { VoiceErrorCodes } from "@/hooks/useVoiceChat";
import type { LiveKitErrorState } from "@/hooks/useLiveKitVoiceClient";

/**
 * Estado de error consolidado para la UI de VoiceControls.
 */
export type ConsolidatedVoiceError = {
    /** Mensaje a mostrar al usuario */
    message: string;
    /** Si el error permite reintentar */
    retryable: boolean;
    /** Fuente del error */
    source: "signaling" | "livekit" | "media" | "moderation";
    /** Prioridad del error (menor = más prioritario) */
    priority: number;
};

export type VoiceControlsProps = {
    /** Lista de participantes en el chat de voz */
    participants: VoiceParticipant[];
    /** Indica si el usuario actual está en el chat de voz */
    joined: boolean;
    /** Indica si el usuario actual está muteado (local) */
    muted: boolean;
    /** Indica si el usuario actual está silenciado por el servidor (host/cohost) */
    serverMuted?: boolean;
    /** Indica si se está procesando la unión */
    joining?: boolean;
    /** Error si ocurrió alguno (deprecated, usar voiceError) */
    error?: string | null;
    /** Estado de error estructurado de useVoiceChat */
    voiceError?: VoiceErrorState | null;
    /** Callback para unirse al chat de voz */
    onJoin: () => void;
    /** Callback para salir del chat de voz */
    onLeave: () => void;
    /** Callback para alternar mute */
    onToggleMute: () => void;
    /** Indica si la feature de voz está habilitada */
    enableVoice: boolean;
    /** Indica si la feature de voice media está habilitada */
    enableVoiceMedia?: boolean;
    /** Indica si el media (micrófono) está activo */
    mediaEnabled?: boolean;
    /** Estado de permisos del micrófono */
    mediaPermissionState?: "idle" | "prompt" | "granted" | "denied" | "error";
    /** Error de media si ocurrió alguno */
    mediaError?: string | null;
    /** Callback para habilitar el micrófono */
    onEnableMedia?: () => Promise<void>;
    /** Callback para deshabilitar el micrófono */
    onDisableMedia?: () => void;
    /** Indica si LiveKit está conectado (opcional) */
    livekitConnected?: boolean;
    /** Indica si LiveKit está conectando (opcional) */
    livekitConnecting?: boolean;
    /** Indica si LiveKit está reconectando (opcional) */
    livekitReconnecting?: boolean;
    /** Indica si el navegador puede reproducir audio (autoplay permitido) */
    livekitCanPlaybackAudio?: boolean;
    /** Error de LiveKit si ocurrió alguno (deprecated, usar livekitErrorState) */
    livekitError?: string | null;
    /** Estado de error estructurado de useLiveKitVoiceClient */
    livekitErrorState?: LiveKitErrorState | null;
    /** Callback para reintentar conexión a LiveKit (opcional) */
    onLivekitRetry?: () => void;
    /** Callback para iniciar reproducción de audio (resolver autoplay) */
    onLivekitStartAudio?: () => Promise<void>;
    /** Callback para limpiar errores de voz (opcional) */
    onClearError?: () => void;
};

/**
 * Obtiene las iniciales de un nombre para mostrar en el avatar.
 */
function getInitials(name?: string): string {
    const safe = (name ?? "").trim() || "U";
    const parts = safe.split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    const result = (first + second).toUpperCase();
    return result || "U";
}

/**
 * Icono de micrófono activo.
 */
function MicIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8"
            />
        </svg>
    );
}

/**
 * Icono de micrófono muteado.
 */
function MicOffIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1 1l22 22M9 9v2a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"
            />
        </svg>
    );
}

/**
 * Icono de micrófono bloqueado por el servidor (silenciado por host).
 */
function MicLockedIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Candado pequeño */}
            <rect x="14" y="1" width="8" height="6" rx="1" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.5 1v-0.5a2.5 2.5 0 015 0V1"
            />
            {/* Micrófono con X */}
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8"
            />
            <line x1="8" y1="5" x2="16" y2="11" strokeWidth={2} />
        </svg>
    );
}

/**
 * Icono de teléfono (unirse).
 */
function PhoneIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
            />
        </svg>
    );
}

/**
 * Icono de colgar (salir).
 */
function PhoneOffIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91"
            />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

/**
 * Icono de refresh/retry.
 */
function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
        </svg>
    );
}

/**
 * Icono de alerta/warning.
 */
function AlertIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
        </svg>
    );
}

/**
 * Componente de controles de chat de voz.
 * 
 * Muestra los controles para unirse, salir y silenciar/activar el micrófono
 * en el chat de voz de una sala.
 */
export function VoiceControls({
    participants,
    joined,
    muted,
    serverMuted = false,
    joining = false,
    error,
    voiceError,
    onJoin,
    onLeave,
    onToggleMute,
    enableVoice,
    enableVoiceMedia = false,
    mediaEnabled: hasMediaAccess = false,
    mediaPermissionState: permissionState = "idle",
    mediaError,
    onEnableMedia,
    onDisableMedia,
    livekitConnected = false,
    livekitConnecting = false,
    livekitReconnecting = false,
    livekitCanPlaybackAudio = true,
    livekitError,
    livekitErrorState,
    onLivekitRetry,
    onLivekitStartAudio,
    onClearError,
}: VoiceControlsProps) {
    // Log de props para debug
    useEffect(() => {
        console.log("[VoiceControls] props updated", {
            enableVoice,
            enableVoiceMedia,
            hasMediaAccess,
            permissionState,
            joined,
            muted,
            serverMuted,
            joining,
            livekitConnected,
            livekitConnecting,
            livekitReconnecting,
            livekitCanPlaybackAudio,
            livekitError,
            participantCount: participants.length,
            error,
        });
    }, [
        enableVoice, enableVoiceMedia, hasMediaAccess, permissionState,
        joined, muted, serverMuted, joining,
        livekitConnected, livekitConnecting, livekitReconnecting,
        livekitCanPlaybackAudio, livekitError, participants.length, error
    ]);

    // Estado local para tracking de solicitud de permisos en curso
    const [requestingMedia, setRequestingMedia] = useState(false);
    // Estado para indicar si debemos proceder con el join después de obtener permisos
    const [pendingJoin, setPendingJoin] = useState(false);

    /**
     * Calcula el error consolidado con prioridad.
     * Prioridad: VOICE_UNAVAILABLE > VOICE_SERVICE_UNAVAILABLE > LIVEKIT errors > media errors > moderation
     */
    const consolidatedError = useMemo((): ConsolidatedVoiceError | null => {
        const errors: ConsolidatedVoiceError[] = [];

        // 1. Error de señalización no disponible (máxima prioridad)
        if (voiceError?.code === VoiceErrorCodes.VOICE_UNAVAILABLE) {
            errors.push({
                message: voiceError.uiMessage || "No hay conexión con el servidor",
                retryable: voiceError.retryable,
                source: "signaling",
                priority: 1,
            });
        }

        // 2. Error de servicio de voz no disponible
        if (voiceError?.code === VoiceErrorCodes.VOICE_SERVICE_UNAVAILABLE) {
            errors.push({
                message: voiceError.uiMessage || "El servicio de voz no está disponible",
                retryable: voiceError.retryable,
                source: "signaling",
                priority: 2,
            });
        }

        // 3. Error de LiveKit (LIVEKIT_UNAVAILABLE o CONNECTION_FAILED)
        if (livekitErrorState?.type) {
            errors.push({
                message: livekitErrorState.message || "Error de conexión de audio",
                retryable: livekitErrorState.retryable,
                source: "livekit",
                priority: livekitErrorState.type === "LIVEKIT_UNAVAILABLE" ? 3 : 4,
            });
        } else if (livekitError) {
            // Fallback para compatibilidad con prop legacy
            errors.push({
                message: livekitError,
                retryable: true,
                source: "livekit",
                priority: 4,
            });
        }

        // 4. Error de media (permisos de micrófono)
        if (mediaError) {
            errors.push({
                message: mediaError,
                retryable: true,
                source: "media",
                priority: 5,
            });
        }

        // 5. Error de timeout o genérico
        if (voiceError?.code === VoiceErrorCodes.VOICE_JOIN_TIMEOUT ||
            voiceError?.code === VoiceErrorCodes.VOICE_SERVER_ERROR) {
            errors.push({
                message: voiceError.uiMessage || "Error al unirse al canal de voz",
                retryable: voiceError.retryable,
                source: "signaling",
                priority: 6,
            });
        }

        // 6. Errores de moderación (menor prioridad, pero se muestran)
        if (voiceError?.code === VoiceErrorCodes.VOICE_SERVER_MUTED ||
            voiceError?.code === VoiceErrorCodes.VOICE_KICKED) {
            errors.push({
                message: voiceError.uiMessage || "Acción de moderación",
                retryable: voiceError.retryable,
                source: "moderation",
                priority: 7,
            });
        }

        // 7. Fallback para error legacy de signaling
        if (error && !voiceError?.code) {
            errors.push({
                message: error,
                retryable: true,
                source: "signaling",
                priority: 8,
            });
        }

        // Ordenar por prioridad y devolver el más prioritario
        errors.sort((a, b) => a.priority - b.priority);
        return errors[0] || null;
    }, [voiceError, livekitErrorState, livekitError, mediaError, error]);

    // Indica si estamos en proceso de unión (solicitud de permisos, joining signaling, o conectando a LiveKit)
    const isJoining = requestingMedia || joining || livekitConnecting;

    // Indica si estamos reconectando
    const isReconnecting = livekitReconnecting;

    // Indica si el servicio de voz no está disponible (bloquea el join)
    const isVoiceUnavailable = voiceError?.code === VoiceErrorCodes.VOICE_UNAVAILABLE ||
                               voiceError?.code === VoiceErrorCodes.VOICE_SERVICE_UNAVAILABLE;

    /**
     * Obtiene el mensaje de estado apropiado para mostrar durante la conexión.
     */
    const getConnectionStatusMessage = useCallback((): string => {
        if (requestingMedia) {
            return "Solicitando permisos de micrófono...";
        }
        if (joining) {
            return "Conectando al canal de voz...";
        }
        if (livekitConnecting) {
            return "Conectando al servidor de audio...";
        }
        if (livekitReconnecting) {
            return "Reconectando al canal de voz...";
        }
        return "Conectando...";
    }, [requestingMedia, joining, livekitConnecting, livekitReconnecting]);

    /**
     * Maneja la solicitud de unirse al canal de voz.
     * Si media está habilitada, primero solicita permisos y luego hace el join.
     */
    const handleJoin = useCallback(async () => {
        console.log("[VoiceControls] handleJoin called", {
            enableVoiceMedia,
            hasOnEnableMedia: !!onEnableMedia,
        });

        if (enableVoiceMedia && onEnableMedia) {
            setRequestingMedia(true);
            setPendingJoin(true);
            await onEnableMedia();
            setRequestingMedia(false);
            // El useEffect abajo manejará el join cuando permissionState cambie
        } else {
            // Sin media habilitada, hacer join directo
            console.log("[VoiceControls] calling onJoin directly (no media)");
            onJoin();
        }
    }, [enableVoiceMedia, onEnableMedia, onJoin]);

    /**
     * Maneja el reintento de conexión completo.
     * Usa el error consolidado para determinar qué acción tomar.
     */
    const handleFullRetry = useCallback(async () => {
        // Limpiar errores previos si tenemos el callback
        if (onClearError) {
            onClearError();
        }

        // Si hay error de media, reintentar obtener permisos
        if ((consolidatedError?.source === "media" || mediaError) && onEnableMedia) {
            setRequestingMedia(true);
            setPendingJoin(true);
            await onEnableMedia();
            setRequestingMedia(false);
            return;
        }

        // Si hay error de LiveKit y tenemos callback de retry
        if ((consolidatedError?.source === "livekit" || livekitError) && onLivekitRetry) {
            onLivekitRetry();
            return;
        }

        // Si no estamos unidos, intentar unirse
        if (!joined) {
            await handleJoin();
        }
    }, [consolidatedError, mediaError, livekitError, onLivekitRetry, joined, handleJoin, onEnableMedia, onClearError]);

    // Effect para manejar el join después de obtener (o no) permisos de media
    React.useEffect(() => {
        console.log("[VoiceControls] pendingJoin effect", {
            pendingJoin,
            requestingMedia,
            permissionState,
            hasMediaAccess,
        });

        if (!pendingJoin) return;

        // Si aún estamos solicitando permisos, esperar
        if (requestingMedia) return;

        // Si estamos en "prompt", enableMedia aún no terminó
        if (permissionState === "prompt") return;

        // Resetear pendingJoin
        setPendingJoin(false);

        // Si obtuvimos acceso al media, proceder con el join
        if (permissionState === "granted" || hasMediaAccess) {
            console.log("[VoiceControls] media ready, calling onJoin");
            onJoin();
        } else {
            console.log("[VoiceControls] media NOT ready, NOT calling onJoin", {
                permissionState,
                hasMediaAccess,
            });
        }
        // Si fue denegado o hubo error, no hacemos join (el error ya se muestra)
    }, [pendingJoin, requestingMedia, permissionState, hasMediaAccess, onJoin]);

    /**
     * Maneja la salida del canal de voz.
     * También apaga el micrófono si media está habilitada.
     */
    const handleLeave = useCallback(() => {
        if (enableVoiceMedia && onDisableMedia) {
            onDisableMedia();
        }
        onLeave();
    }, [enableVoiceMedia, onDisableMedia, onLeave]);

    // Si la feature no está habilitada, no renderizar nada
    if (!enableVoice) {
        return null;
    }

    /**
     * Determina el estado visual y texto del indicador de conexión LiveKit.
     */
    const getLivekitStatusInfo = () => {
        if (livekitConnected) {
            return {
                className: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30",
                dotClassName: "bg-emerald-400 animate-pulse",
                text: "En vivo",
                title: "Audio conectado",
            };
        }
        if (isReconnecting) {
            return {
                className: "text-orange-300 bg-orange-500/10 border border-orange-500/30",
                dotClassName: "bg-orange-400 animate-pulse",
                text: "Reconectando...",
                title: "Reconectando al servidor de audio",
            };
        }
        if (livekitConnecting) {
            return {
                className: "text-yellow-300 bg-yellow-500/10 border border-yellow-500/30",
                dotClassName: "bg-yellow-400 animate-pulse",
                text: "Conectando...",
                title: "Conectando al servidor de audio",
            };
        }
        return {
            className: "text-slate-400 bg-slate-700/50 border border-slate-600/30",
            dotClassName: "bg-slate-500",
            text: "Sin audio",
            title: "Audio no conectado",
        };
    };

    const livekitStatus = getLivekitStatusInfo();

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                    <MicIcon className="w-4 h-4 text-purple-400" />
                    Canal de voz
                </h4>
                <div className="flex items-center gap-2">
                    {/* LiveKit connection status indicator */}
                    {joined && (
                        <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${livekitStatus.className}`}
                            title={livekitStatus.title}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${livekitStatus.dotClassName}`}
                            />
                            {livekitStatus.text}
                        </span>
                    )}
                    {joined && participants.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs text-slate-300 bg-slate-900/60 border border-slate-700/70 rounded-full">
                            {participants.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Reconnecting banner */}
            {joined && isReconnecting && !consolidatedError && (
                <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin flex-shrink-0" />
                        <p className="text-xs text-orange-300">Reconectando al canal de voz...</p>
                    </div>
                </div>
            )}

            {/* Audio blocked by autoplay policy banner */}
            {joined && livekitConnected && !livekitCanPlaybackAudio && !consolidatedError && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-yellow-300">
                                El navegador bloqueó la reproducción de audio. Haz clic para habilitar.
                            </p>
                        </div>
                    </div>
                    {onLivekitStartAudio && (
                        <button
                            onClick={onLivekitStartAudio}
                            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300"
                        >
                            <MicIcon className="w-3 h-3" />
                            Habilitar audio
                        </button>
                    )}
                </div>
            )}

            {/* Consolidated error message with retry button */}
            {consolidatedError && (
                <div className={`mb-3 p-3 rounded-lg ${
                    consolidatedError.source === "moderation"
                        ? "bg-orange-500/10 border border-orange-500/30"
                        : "bg-red-500/10 border border-red-500/30"
                }`}>
                    <div className="flex items-start gap-2">
                        <AlertIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            consolidatedError.source === "moderation"
                                ? "text-orange-400"
                                : "text-red-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs break-words ${
                                consolidatedError.source === "moderation"
                                    ? "text-orange-300"
                                    : "text-red-400"
                            }`}>{consolidatedError.message}</p>
                        </div>
                    </div>
                    {/* Botón de reintentar: mostrar solo si el error es retryable */}
                    {consolidatedError.retryable && (!joined || (joined && onLivekitRetry)) && (
                        <button
                            onClick={joined && consolidatedError.source === "livekit" ? onLivekitRetry : handleFullRetry}
                            disabled={isJoining || isReconnecting}
                            className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                consolidatedError.source === "moderation"
                                    ? "bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300"
                                    : "bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300"
                            }`}
                        >
                            <RefreshIcon className="w-3 h-3" />
                            Reintentar conexión
                        </button>
                    )}
                </div>
            )}

            {/* Contenido según el estado */}
            {!joined ? (
                /* Estado: No unido al canal de voz */
                <div className="space-y-3">
                    {isJoining ? (
                        /* Estado: Conectando */
                        <div className="flex flex-col items-center justify-center py-4 space-y-3">
                            <div className="relative">
                                <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <MicIcon className="absolute inset-0 m-auto w-5 h-5 text-purple-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-white">
                                    {getConnectionStatusMessage()}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Esto puede tomar unos segundos</p>
                            </div>
                        </div>
                    ) : (
                        /* Estado: Listo para unirse */
                        <>
                            <p className="text-sm text-slate-400">
                                {isVoiceUnavailable
                                    ? "El canal de voz no está disponible en este momento."
                                    : "Únete al canal de voz para hablar con otros participantes."
                                }
                            </p>
                            <button
                                onClick={handleJoin}
                                disabled={isJoining || isVoiceUnavailable}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isVoiceUnavailable
                                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                                }`}
                                title={isVoiceUnavailable ? "El servicio de voz no está disponible" : undefined}
                            >
                                <PhoneIcon className="w-4 h-4" />
                                Unirme al canal de voz
                            </button>
                        </>
                    )}
                </div>
            ) : (
                /* Estado: Unido al canal de voz */
                <div className="space-y-4">
                    {/* Lista de participantes */}
                    {participants.length > 0 && (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {participants.map((participant) => (
                                <li
                                    key={participant.userId}
                                    className="flex items-center gap-2 py-1"
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs text-white border flex-shrink-0 ${
                                            participant.isSelf
                                                ? "bg-gradient-to-br from-purple-500 to-blue-500 border-purple-400/50"
                                                : "bg-gradient-to-br from-slate-600 to-slate-700 border-slate-600/50"
                                        }`}
                                    >
                                        {getInitials(participant.displayName)}
                                    </div>

                                    {/* Nombre */}
                                    <span
                                        className={`flex-1 text-sm truncate ${
                                            participant.isSelf
                                                ? "text-white font-medium"
                                                : "text-slate-300"
                                        }`}
                                    >
                                        {participant.displayName || "Usuario"}
                                        {participant.isSelf && (
                                            <span className="ml-1 text-xs text-slate-400">
                                                (tú)
                                            </span>
                                        )}
                                    </span>

                                    {/* Indicador de mute */}
                                    <div
                                        className={`flex-shrink-0 ${
                                            participant.serverMuted
                                                ? "text-orange-400"
                                                : participant.muted
                                                    ? "text-red-400"
                                                    : "text-emerald-400"
                                        }`}
                                        title={
                                            participant.serverMuted
                                                ? "Silenciado por el host"
                                                : participant.muted
                                                    ? "Micrófono silenciado"
                                                    : "Micrófono activo"
                                        }
                                    >
                                        {participant.serverMuted ? (
                                            <MicLockedIcon className="w-4 h-4" />
                                        ) : participant.muted ? (
                                            <MicOffIcon className="w-4 h-4" />
                                        ) : (
                                            <MicIcon className="w-4 h-4" />
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Server muted banner */}
                    {serverMuted && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <MicLockedIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                <p className="text-xs text-orange-300">
                                    Has sido silenciado por el host. No puedes activar tu micrófono.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Controles */}
                    <div className="flex gap-2">
                        {/* Botón Mute/Unmute */}
                        <button
                            onClick={onToggleMute}
                            disabled={serverMuted}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95 ${
                                serverMuted
                                    ? "bg-orange-700/50 text-orange-300 cursor-not-allowed"
                                    : muted
                                        ? "bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 hover:text-white"
                                        : "bg-emerald-600/80 hover:bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/20"
                            }`}
                            title={
                                serverMuted
                                    ? "Silenciado por el host"
                                    : muted
                                        ? "Activar micrófono"
                                        : "Silenciar micrófono"
                            }
                        >
                            {serverMuted ? (
                                <>
                                    <MicLockedIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Silenciado</span>
                                </>
                            ) : muted ? (
                                <>
                                    <MicOffIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Activar mic</span>
                                </>
                            ) : (
                                <>
                                    <MicIcon className="w-4 h-4 animate-pulse" />
                                    <span className="hidden sm:inline">Silenciar</span>
                                </>
                            )}
                        </button>

                        {/* Botón Salir */}
                        <button
                            onClick={handleLeave}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/80 hover:bg-red-500/80 text-white text-sm font-medium rounded-xl transition-all duration-150 active:scale-95"
                            title="Salir del canal de voz"
                        >
                            <PhoneOffIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VoiceControls;
