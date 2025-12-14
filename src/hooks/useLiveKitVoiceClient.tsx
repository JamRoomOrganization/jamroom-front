"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import {
    Room,
    RoomEvent,
    LocalAudioTrack,
    createLocalAudioTrack,
    Track,
    DisconnectReason,
} from "livekit-client";

/**
 * Verifica si el debug está habilitado.
 * Solo loggea en desarrollo o si NEXT_PUBLIC_VOICE_DEBUG está activo.
 */
function isDebugEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return (
        process.env.NODE_ENV !== "production" ||
        process.env.NEXT_PUBLIC_VOICE_DEBUG === "true"
    );
}

/**
 * Logger de debug para LiveKit.
 * No loggea tokens ni secretos.
 * Usa console.log en lugar de console.debug para mayor visibilidad.
 */
function debugLog(
    action: string,
    data?: Record<string, unknown>
): void {
    if (!isDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    // Usar console.log para que sea más visible en DevTools
    console.log(`[LiveKit][${timestamp}] ${action}`, data ?? "");
}

/**
 * Payload recibido del servidor cuando se crea una sesión de voz.
 */
type LivekitSessionPayload = {
    sessionId: string;
    roomId: string;
    userId: string;
    livekit: {
        roomName: string;
        identity: string;
        token: string;
        url: string;
        expiresAt: string;
    };
};

/**
 * Tipos de error de LiveKit para la UI.
 */
export type LiveKitErrorType = 
    | "AUTH_FAILED" 
    | "CONNECTION_FAILED" 
    | "NETWORK_ERROR" 
    | "LIVEKIT_UNAVAILABLE"
    | null;

/**
 * Estado de error estructurado para LiveKit.
 */
export type LiveKitErrorState = {
    /** Tipo de error para manejo programático */
    type: LiveKitErrorType;
    /** Mensaje de error para mostrar al usuario */
    message: string | null;
    /** Indica si el error permite reintentar */
    retryable: boolean;
};

/**
 * Estado de error inicial (sin error).
 */
const NO_LIVEKIT_ERROR: LiveKitErrorState = {
    type: null,
    message: null,
    retryable: false,
};

/**
 * Resultado del hook useLiveKitVoiceClient.
 */
export type UseLiveKitVoiceClientResult = {
    /** Indica si está conectado al servidor de voz LiveKit */
    connected: boolean;
    /** Indica si está en proceso de conexión (primera vez) */
    connecting: boolean;
    /** Indica si está en proceso de reconexión */
    reconnecting: boolean;
    /** Indica si el navegador puede reproducir audio (autoplay permitido) */
    canPlaybackAudio: boolean;
    /** Error si ocurrió alguno */
    error: string | null;
    /** Tipo de error para manejo en UI */
    errorType: LiveKitErrorType;
    /** Estado de error estructurado */
    livekitError: LiveKitErrorState;
    /** Número de intentos de reconexión realizados */
    reconnectAttempts: number;
    /** Función para forzar un reintento de conexión */
    retryConnection: () => void;
    /** Función para iniciar la reproducción de audio (resolver autoplay) */
    startAudio: () => Promise<void>;
};

/**
 * Parámetros del hook useLiveKitVoiceClient.
 */
export type UseLiveKitVoiceClientParams = {
    /** ID de la sala */
    roomId: string;
    /** Socket de la conexión (compartido con useRoom) */
    socket: Socket | null;
    /** Indica si el usuario está unido al chat de voz (de useVoiceChat) */
    joined: boolean;
    /** Stream de audio del micrófono (de useVoiceMedia) */
    mediaStream: MediaStream | null;
};

/**
 * Verifica si la feature de LiveKit está habilitada.
 */
function isVoiceLiveKitEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return process.env.NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT === "true";
}

/**
 * Configuración de reintentos.
 */
const RECONNECT_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
};

/**
 * Resultado no-op cuando la feature está deshabilitada.
 */
const DISABLED_RESULT: UseLiveKitVoiceClientResult = {
    connected: false,
    connecting: false,
    reconnecting: false,
    canPlaybackAudio: true,
    error: null,
    errorType: null,
    livekitError: NO_LIVEKIT_ERROR,
    reconnectAttempts: 0,
    retryConnection: () => {},
    startAudio: async () => {},
};

/**
 * Determina si un error es de autenticación.
 */
function isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("unauthorized") ||
            msg.includes("401") ||
            msg.includes("token") ||
            msg.includes("expired") ||
            msg.includes("invalid") ||
            msg.includes("forbidden") ||
            msg.includes("403")
        );
    }
    return false;
}

/**
 * Determina si un error es de red/fetch (servidor no accesible).
 */
function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("fetch failed") ||
            msg.includes("network") ||
            msg.includes("failed to fetch") ||
            msg.includes("net::err") ||
            msg.includes("networkerror") ||
            msg.includes("connection refused") ||
            msg.includes("econnrefused") ||
            msg.includes("timeout")
        );
    }
    return false;
}

/**
 * Obtiene un mensaje de error amigable basado en el tipo de error.
 */
function getErrorMessage(error: unknown): string {
    if (isAuthError(error)) {
        return "Error de autenticación con el servidor de voz. Por favor, sal y vuelve a unirte.";
    }
    if (isNetworkError(error)) {
        return "No se puede conectar al servidor de voz. Verifica tu conexión a internet.";
    }
    if (error instanceof Error) {
        // Para otros errores, mostrar un mensaje genérico pero loggear el real
        console.error("[LiveKit] Connection error details:", error.message);
        return "Error al conectar con el servidor de voz. Intenta nuevamente.";
    }
    return "Error desconocido al conectar con el servidor de voz.";
}

/**
 * Calcula el delay para el siguiente intento con backoff exponencial.
 */
function calculateBackoffDelay(attempt: number): number {
    const delay = RECONNECT_CONFIG.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, RECONNECT_CONFIG.maxDelayMs);
}

/**
 * Hook para gestionar la conexión a LiveKit para chat de voz.
 *
 * Este hook maneja la conexión al servidor SFU de LiveKit,
 * publicando el audio del micrófono y suscribiéndose a los tracks de otros participantes.
 * Incluye lógica de reconexión automática con backoff exponencial.
 *
 * @param params - Parámetros de configuración
 * @returns Estado de la conexión a LiveKit
 */
export function useLiveKitVoiceClient(
    params: UseLiveKitVoiceClientParams
): UseLiveKitVoiceClientResult {
    const { roomId, socket, joined, mediaStream } = params;

    // Feature flag
    const livekitEnabled = isVoiceLiveKitEnabled();

    // Log de montaje inicial para verificar que el hook se ejecuta
    useEffect(() => {
        console.log("[LiveKit] hook mounted", {
            roomId,
            livekitEnabled,
            hasSocket: !!socket,
            socketConnected: socket?.connected,
            joined,
            hasMediaStream: !!mediaStream,
            envFlags: {
                NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT: process.env.NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT,
                NEXT_PUBLIC_VOICE_DEBUG: process.env.NEXT_PUBLIC_VOICE_DEBUG,
            }
        });
    }, []);

    // Estado
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<LiveKitErrorType>(null);
    const [livekitError, setLivekitError] = useState<LiveKitErrorState>(NO_LIVEKIT_ERROR);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    // Refs
    const mountedRef = useRef(true);
    const roomRef = useRef<Room | null>(null);
    const localTrackRef = useRef<LocalAudioTrack | null>(null);
    const voiceSessionRef = useRef<LivekitSessionPayload | null>(null);
    const isConnectingRef = useRef(false);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    // Ref to hold the connect function to avoid circular dependency
    const connectToLiveKitInternalRef = useRef<
        ((session: LivekitSessionPayload, stream: MediaStream, isReconnect?: boolean) => Promise<void>) | null
    >(null);

    // Mantener mediaStreamRef actualizado
    useEffect(() => {
        mediaStreamRef.current = mediaStream;
    }, [mediaStream]);

    // Cleanup del mounted ref al desmontar
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    /**
     * Helper para establecer un error estructurado de LiveKit.
     */
    const setLivekitErrorFromType = useCallback((
        type: LiveKitErrorType,
        message: string,
        retryable: boolean
    ) => {
        debugLog("setting livekit error", { type, message, retryable });
        setError(message);
        setErrorType(type);
        setLivekitError({ type, message, retryable });
    }, []);

    /**
     * Helper para limpiar el estado de error.
     */
    const clearLivekitError = useCallback(() => {
        setError(null);
        setErrorType(null);
        setLivekitError(NO_LIVEKIT_ERROR);
    }, []);

    /**
     * Limpia el timeout de reconexión pendiente.
     */
    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    /**
     * Limpia la conexión a LiveKit.
     */
    const cleanupLiveKit = useCallback((resetReconnectState = true) => {
        clearReconnectTimeout();

        if (localTrackRef.current) {
            try {
                localTrackRef.current.stop();
            } catch (e) {
                debugLog("cleanup: error stopping local track", { error: String(e) });
            }
            localTrackRef.current = null;
        }

        if (roomRef.current) {
            try {
                // removeAllListeners limpia todos los event listeners antes de desconectar
                roomRef.current.removeAllListeners();
                roomRef.current.disconnect();
            } catch (e) {
                debugLog("cleanup: error disconnecting room", { error: String(e) });
            }
            roomRef.current = null;
        }

        if (mountedRef.current) {
            setConnected(false);
            setConnecting(false);
            setReconnecting(false);
            if (resetReconnectState) {
                reconnectAttemptsRef.current = 0;
                setReconnectAttempts(0);
            }
        }

        isConnectingRef.current = false;
    }, [clearReconnectTimeout]);

    /**
     * Maneja el evento de desconexión de LiveKit.
     */
    const handleDisconnected = useCallback((reason?: DisconnectReason) => {
        debugLog("disconnected", { reason, roomId });

        if (!mountedRef.current) return;

        // Limpiar referencias de room sin resetear estado de reconexión
        if (localTrackRef.current) {
            try {
                localTrackRef.current.stop();
            } catch (e) {
                debugLog("error stopping local track", { error: String(e) });
            }
            localTrackRef.current = null;
        }
        roomRef.current = null;
        isConnectingRef.current = false;

        setConnected(false);
        setConnecting(false);

        // Determinar si debemos reintentar
        const isUnexpectedDisconnect = 
            reason !== DisconnectReason.CLIENT_INITIATED &&
            reason !== DisconnectReason.DUPLICATE_IDENTITY;

        if (isUnexpectedDisconnect && joined && mediaStreamRef.current && voiceSessionRef.current) {
            // Verificar límite de reintentos
            if (reconnectAttemptsRef.current < RECONNECT_CONFIG.maxAttempts) {
                const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
                debugLog("scheduling reconnect", {
                    attempt: reconnectAttemptsRef.current + 1,
                    maxAttempts: RECONNECT_CONFIG.maxAttempts,
                    delayMs: delay,
                    roomId,
                });

                setReconnecting(true);
                clearLivekitError();

                reconnectTimeoutRef.current = setTimeout(() => {
                    if (mountedRef.current && voiceSessionRef.current && mediaStreamRef.current) {
                        reconnectAttemptsRef.current += 1;
                        setReconnectAttempts(reconnectAttemptsRef.current);
                        // Intentar reconectar usando la ref
                        connectToLiveKitInternalRef.current?.(voiceSessionRef.current, mediaStreamRef.current, true);
                    }
                }, delay);
            } else {
                debugLog("max reconnect attempts reached", {
                    attempts: reconnectAttemptsRef.current,
                    roomId,
                });
                setReconnecting(false);
                setLivekitErrorFromType(
                    "CONNECTION_FAILED",
                    "No se pudo reconectar al servidor de voz después de varios intentos.",
                    true
                );
            }
        } else {
            setReconnecting(false);
        }
    }, [joined, roomId, setLivekitErrorFromType, clearLivekitError]);

    /**
     * Conecta a LiveKit con la sesión proporcionada (implementación interna).
     */
    const connectToLiveKitInternal = useCallback(
        async (session: LivekitSessionPayload, stream: MediaStream, isReconnect = false) => {
            // Evitar conexiones concurrentes
            if (isConnectingRef.current || roomRef.current) {
                return;
            }

            isConnectingRef.current = true;

            if (mountedRef.current) {
                if (isReconnect) {
                    setReconnecting(true);
                    setConnecting(false);
                } else {
                    setConnecting(true);
                    setReconnecting(false);
                }
                clearLivekitError();
            }

            try {
                // Crear instancia de Room
                const room = new Room({
                    // Audio only, desactiva adaptiveStream para video
                    adaptiveStream: false,
                    dynacast: false,
                });

                // Suscribirse a eventos antes de conectar
                room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    // Solo procesar RemoteAudioTrack (no locales ni video)
                    if (track.kind === Track.Kind.Audio && !participant.isLocal) {
                        debugLog("remote audio track subscribed", {
                            participantIdentity: participant.identity,
                            trackSid: track.sid,
                            trackKind: track.kind,
                            isLocal: participant.isLocal,
                            canPlaybackAudio: room.canPlaybackAudio,
                        });

                        // Attach crea un <audio> element
                        const audioElement = track.attach();

                        // Configurar el elemento de audio para reproducción
                        audioElement.setAttribute("data-voice-remote", "true");
                        audioElement.setAttribute("data-participant-id", participant.identity);
                        if (track.sid) {
                            audioElement.setAttribute("data-track-sid", track.sid);
                        }
                        audioElement.autoplay = true;
                        audioElement.setAttribute("playsinline", "true");
                        // IMPORTANTE: Para tracks REMOTOS, muted debe ser FALSE para escucharlos
                        audioElement.muted = false;
                        
                        // Agregar al DOM
                        document.body.appendChild(audioElement);
                        
                        debugLog("audio element appended to DOM", {
                            participantIdentity: participant.identity,
                            trackSid: track.sid,
                            audioAutoplay: audioElement.autoplay,
                            audioMuted: audioElement.muted,
                            audioSrc: audioElement.src ? "has src" : "no src",
                            audioSrcObject: audioElement.srcObject ? "has srcObject" : "no srcObject",
                            audioReadyState: audioElement.readyState,
                        });

                        // Intentar reproducir explícitamente (por si autoplay no funciona)
                        audioElement.play().catch((err) => {
                            debugLog("audio play() failed (autoplay policy)", {
                                participantIdentity: participant.identity,
                                error: err.message,
                            });
                        });
                    }
                });

                room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                    debugLog("track unsubscribed", { 
                        participantIdentity: participant.identity,
                        trackSid: track.sid,
                        trackKind: track.kind,
                    });
                    
                    // Remover los elementos de audio del DOM antes de detach
                    // Usar track.sid si está disponible, sino buscar por participant
                    const selector = track.sid 
                        ? `audio[data-voice-remote="true"][data-track-sid="${track.sid}"]`
                        : `audio[data-voice-remote="true"][data-participant-id="${participant.identity}"]`;
                    const audioElements = document.querySelectorAll(selector);
                    audioElements.forEach((audioEl) => {
                        audioEl.remove();
                        debugLog("audio element removed from DOM", {
                            participantIdentity: participant.identity,
                            trackSid: track.sid,
                        });
                    });
                    track.detach();
                });

                // Handler para detectar si el navegador bloquea la reproducción de audio
                room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
                    const canPlay = room.canPlaybackAudio;
                    debugLog("audio playback status changed", { 
                        canPlaybackAudio: canPlay,
                        roomId,
                    });
                    if (mountedRef.current) {
                        setCanPlaybackAudio(canPlay);
                    }
                });

                room.on(RoomEvent.Disconnected, handleDisconnected);

                room.on(RoomEvent.Reconnecting, () => {
                    debugLog("SDK reconnecting", { roomId });
                    if (mountedRef.current) {
                        setReconnecting(true);
                    }
                });

                room.on(RoomEvent.Reconnected, () => {
                    debugLog("SDK reconnected", { roomId });
                    if (mountedRef.current) {
                        setReconnecting(false);
                        setConnected(true);
                        // Reset reconnect attempts on successful reconnection
                        reconnectAttemptsRef.current = 0;
                        setReconnectAttempts(0);
                    }
                });

                // Conectar a LiveKit
                await room.connect(session.livekit.url, session.livekit.token);

                // Verificar que aún estamos montados
                if (!mountedRef.current) {
                    room.disconnect();
                    return;
                }

                roomRef.current = room;

                // Verificar estado inicial de audio playback
                debugLog("initial audio playback status", {
                    canPlaybackAudio: room.canPlaybackAudio,
                    roomId,
                });
                if (mountedRef.current) {
                    setCanPlaybackAudio(room.canPlaybackAudio);
                }

                // Intentar iniciar la reproducción de audio
                // Esto ayuda a resolver problemas de autoplay en algunos navegadores
                try {
                    await room.startAudio();
                    debugLog("room.startAudio() completed successfully", { roomId });
                } catch (startAudioErr) {
                    // No es un error crítico, el usuario puede necesitar hacer click
                    debugLog("room.startAudio() failed (user interaction may be required)", {
                        roomId,
                        error: startAudioErr instanceof Error ? startAudioErr.message : String(startAudioErr),
                    });
                }

                // Crear y publicar el track de audio local con constraints de alta calidad
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    const settings = audioTrack.getSettings();
                    const deviceId = settings.deviceId;

                    // Crear track con constraints optimizados para voz de alta calidad
                    const localTrack = await createLocalAudioTrack({
                        deviceId: deviceId,
                        // Configuración de procesamiento de audio de alta calidad
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        // Tasa de bits optimizada para voz (reduce ancho de banda sin perder calidad)
                        // LiveKit usará Opus codec por defecto que es excelente para voz
                    });

                    // Verificar que aún estamos montados
                    if (!mountedRef.current) {
                        localTrack.stop();
                        room.disconnect();
                        return;
                    }

                    localTrackRef.current = localTrack;

                    // Publicar el track
                    await room.localParticipant.publishTrack(localTrack);

                    debugLog("local audio track published", { roomId });
                }

                if (mountedRef.current) {
                    setConnected(true);
                    setConnecting(false);
                    setReconnecting(false);
                    clearLivekitError();
                    // Reset reconnect attempts on successful connection
                    reconnectAttemptsRef.current = 0;
                    setReconnectAttempts(0);
                }

                debugLog("connected successfully", { roomId, isReconnect });
            } catch (err) {
                debugLog("connect error", {
                    roomId,
                    isReconnect,
                    error: err instanceof Error ? err.message : String(err),
                });

                if (mountedRef.current) {
                    // Determinar tipo de error y mensaje apropiado
                    const errorMessage = getErrorMessage(err);
                    
                    if (isAuthError(err)) {
                        setLivekitErrorFromType(
                            "AUTH_FAILED",
                            errorMessage,
                            false
                        );
                        setConnected(false);
                        setConnecting(false);
                        setReconnecting(false);
                        // No reintentar en errores de auth
                        reconnectAttemptsRef.current = RECONNECT_CONFIG.maxAttempts;
                        setReconnectAttempts(RECONNECT_CONFIG.maxAttempts);
                    } else if (isNetworkError(err)) {
                        // Error de red - servidor no accesible
                        setLivekitErrorFromType(
                            "LIVEKIT_UNAVAILABLE",
                            errorMessage,
                            true
                        );
                        setConnected(false);
                        setConnecting(false);
                        setReconnecting(false);
                    } else if (isReconnect && reconnectAttemptsRef.current < RECONNECT_CONFIG.maxAttempts) {
                        // Programar otro reintento
                        const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
                        debugLog("reconnect failed, scheduling retry", {
                            attempt: reconnectAttemptsRef.current + 1,
                            maxAttempts: RECONNECT_CONFIG.maxAttempts,
                            delayMs: delay,
                            roomId,
                        });

                        setReconnecting(true);
                        setConnecting(false);

                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (mountedRef.current && voiceSessionRef.current && mediaStreamRef.current) {
                                reconnectAttemptsRef.current += 1;
                                setReconnectAttempts(reconnectAttemptsRef.current);
                                connectToLiveKitInternalRef.current?.(voiceSessionRef.current, mediaStreamRef.current, true);
                            }
                        }, delay);
                    } else {
                        setLivekitErrorFromType(
                            "CONNECTION_FAILED",
                            errorMessage,
                            true
                        );
                        setConnected(false);
                        setConnecting(false);
                        setReconnecting(false);
                    }
                }

                // Limpiar en caso de error (sin resetear estado de reconexión si vamos a reintentar)
                if (localTrackRef.current) {
                    try {
                        localTrackRef.current.stop();
                    } catch (e) {
                        debugLog("error cleanup: error stopping local track", { error: String(e) });
                    }
                    localTrackRef.current = null;
                }
                roomRef.current = null;
            } finally {
                isConnectingRef.current = false;
            }
        },
        [handleDisconnected, clearLivekitError, setLivekitErrorFromType]
    );

    // Keep the ref updated with the latest function
    connectToLiveKitInternalRef.current = connectToLiveKitInternal;

    /**
     * Conecta a LiveKit con la sesión proporcionada (API pública).
     */
    const connectToLiveKit = useCallback(
        async (session: LivekitSessionPayload, stream: MediaStream) => {
            // Reset reconnect state for fresh connection
            reconnectAttemptsRef.current = 0;
            setReconnectAttempts(0);
            await connectToLiveKitInternal(session, stream, false);
        },
        [connectToLiveKitInternal]
    );

    /**
     * Función para forzar un reintento de conexión.
     */
    const retryConnection = useCallback(() => {
        if (!voiceSessionRef.current || !mediaStreamRef.current) {
            debugLog("retry blocked: missing session or media stream", { roomId });
            return;
        }

        if (isConnectingRef.current || roomRef.current) {
            debugLog("retry blocked: already connected or connecting", { roomId });
            return;
        }

        debugLog("manual retry requested", { roomId });

        // Limpiar estado de error
        setError(null);
        setErrorType(null);

        // Reset intentos y reconectar
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);

        connectToLiveKit(voiceSessionRef.current, mediaStreamRef.current);
    }, [connectToLiveKit, roomId]);

    /**
     * Función para iniciar la reproducción de audio manualmente.
     * Debe ser llamada desde un evento de usuario (click/tap) para evitar
     * bloqueos por políticas de autoplay del navegador.
     */
    const startAudio = useCallback(async () => {
        if (!roomRef.current) {
            debugLog("startAudio: no room connected", { roomId });
            return;
        }

        debugLog("startAudio: attempting to start audio playback", { 
            roomId,
            canPlaybackAudio: roomRef.current.canPlaybackAudio,
        });

        try {
            await roomRef.current.startAudio();
            debugLog("startAudio: audio playback started successfully", { roomId });
            
            if (mountedRef.current) {
                setCanPlaybackAudio(roomRef.current.canPlaybackAudio);
            }
        } catch (err) {
            debugLog("startAudio: failed to start audio", {
                roomId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }, [roomId]);

    /**
     * Handler para el evento voice:session del socket.
     */
    const handleVoiceSession = useCallback(
        (payload: LivekitSessionPayload) => {
            // Ignorar si el roomId no coincide
            if (payload.roomId !== roomId) {
                console.log("[LiveKit] ignoring voice:session for different room", { 
                    payloadRoomId: payload.roomId, 
                    currentRoomId: roomId 
                });
                return;
            }

            console.log("[LiveKit] received voice:session", { 
                roomId, 
                sessionId: payload.sessionId,
                hasLivekitUrl: !!payload.livekit?.url,
                hasToken: !!payload.livekit?.token,
                livekitUrl: payload.livekit?.url,
                joined,
                hasMediaStream: !!mediaStream,
            });

            // Guardar la sesión SIEMPRE - el efecto principal manejará la conexión
            voiceSessionRef.current = payload;

            // Si ya estamos unidos y tenemos mediaStream, conectar inmediatamente
            if (joined && mediaStream) {
                console.log("[LiveKit] conditions met, connecting to LiveKit NOW", { roomId });
                connectToLiveKit(payload, mediaStream);
            } else {
                console.log("[LiveKit] voice:session saved, waiting for conditions", { 
                    roomId, 
                    joined, 
                    hasMediaStream: !!mediaStream,
                    note: "Will connect when joined=true and mediaStream available" 
                });
            }
        },
        [roomId, joined, mediaStream, connectToLiveKit]
    );

    // Suscribirse al evento voice:session del socket
    useEffect(() => {
        if (!livekitEnabled) {
            console.log("[LiveKit] voice:session listener NOT attached (livekitEnabled=false)");
            return;
        }
        if (!socket) {
            console.log("[LiveKit] voice:session listener NOT attached (no socket)");
            return;
        }

        console.log("[LiveKit] attaching voice:session listener", {
            roomId,
            socketConnected: socket.connected,
        });

        socket.on("voice:session", handleVoiceSession);

        return () => {
            console.log("[LiveKit] detaching voice:session listener", { roomId });
            socket.off("voice:session", handleVoiceSession);
        };
    }, [livekitEnabled, socket, handleVoiceSession]);

    // Efecto principal: conectar cuando joined + mediaStream + voiceSession
    useEffect(() => {
        if (!livekitEnabled) {
            debugLog("livekit disabled by feature flag");
            return;
        }

        console.log("[LiveKit] connection effect triggered", {
            roomId,
            joined,
            hasMediaStream: !!mediaStream,
            hasVoiceSession: !!voiceSessionRef.current,
            hasRoom: !!roomRef.current,
            isConnecting: isConnectingRef.current,
            hasReconnectTimeout: !!reconnectTimeoutRef.current,
        });

        // Si dejamos de estar joined o perdemos mediaStream, desconectar
        if (!joined || !mediaStream) {
            if (roomRef.current || reconnectTimeoutRef.current) {
                debugLog("cleaning up (joined or mediaStream changed)", { roomId, joined, hasMediaStream: !!mediaStream });
                cleanupLiveKit();
            }
            return;
        }

        // Si tenemos sesión y no estamos conectados ni conectando, intentar conectar
        if (voiceSessionRef.current && !roomRef.current && !isConnectingRef.current && !reconnectTimeoutRef.current) {
            debugLog("all conditions met, triggering connection from effect", { roomId });
            connectToLiveKit(voiceSessionRef.current, mediaStream);
        }
    }, [livekitEnabled, joined, mediaStream, connectToLiveKit, cleanupLiveKit, roomId]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            cleanupLiveKit();
            voiceSessionRef.current = null;
        };
    }, [cleanupLiveKit]);

    // Si la feature no está habilitada, devolver resultado no-op
    if (!livekitEnabled) {
        return DISABLED_RESULT;
    }

    return {
        connected,
        connecting,
        reconnecting,
        canPlaybackAudio,
        error,
        errorType,
        livekitError,
        reconnectAttempts,
        retryConnection,
        startAudio,
    };
}

export default useLiveKitVoiceClient;
