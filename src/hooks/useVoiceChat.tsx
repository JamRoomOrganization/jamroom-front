"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

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
 * Logger de debug para VoiceChat.
 * Usa console.log para mayor visibilidad.
 */
function debugLog(
    action: string,
    data?: Record<string, unknown>
): void {
    if (!isDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    console.log(`[VoiceChat][${timestamp}] ${action}`, data ?? "");
}

/**
 * Roles posibles para un participante en el chat de voz.
 */
export type VoiceRole = "host" | "cohost" | "speaker" | "listener";

/**
 * Representa un participante en el chat de voz.
 */
export type VoiceParticipant = {
    userId: string;
    displayName?: string;
    /** Mute local (controlado por el usuario) */
    muted: boolean;
    /** Mute del servidor (controlado por el host/cohost) */
    serverMuted?: boolean;
    /** Rol del participante en el chat de voz */
    role?: VoiceRole;
    isSelf: boolean;
};

/**
 * Estado del servidor para el chat de voz.
 */
type VoiceStatePayload = {
    participants: Array<{
        userId: string;
        displayName?: string;
        muted: boolean;
        serverMuted?: boolean;
        role?: VoiceRole;
    }>;
};

/**
 * Tipos de acciones de moderación de voz.
 */
export type VoiceModerationAction = "SERVER_MUTE" | "SERVER_UNMUTE" | "KICK";

/**
 * Payload del evento voice:moderation.
 */
export type VoiceModerationPayload = {
    type: VoiceModerationAction;
    roomId: string;
    targetUserId?: string;
    reason?: string;
};

/**
 * Códigos de error de voz estructurados.
 */
export const VoiceErrorCodes = {
    /** Señalización de voz no disponible (sin conexión al servidor) */
    VOICE_UNAVAILABLE: "VOICE_UNAVAILABLE",
    /** Servicio de voz no disponible (error del servidor) */
    VOICE_SERVICE_UNAVAILABLE: "VOICE_SERVICE_UNAVAILABLE",
    /** Tiempo de espera agotado al unirse */
    VOICE_JOIN_TIMEOUT: "VOICE_JOIN_TIMEOUT",
    /** Silenciado por el host */
    VOICE_SERVER_MUTED: "VOICE_SERVER_MUTED",
    /** Expulsado del chat de voz */
    VOICE_KICKED: "VOICE_KICKED",
    /** Error genérico del servidor */
    VOICE_SERVER_ERROR: "VOICE_SERVER_ERROR",
} as const;

export type VoiceErrorCode = typeof VoiceErrorCodes[keyof typeof VoiceErrorCodes];

/**
 * Estado de error estructurado para el chat de voz.
 */
export type VoiceErrorState = {
    /** Código de error para manejo programático */
    code: VoiceErrorCode | null;
    /** Mensaje técnico del error */
    message: string | null;
    /** Mensaje amigable para mostrar al usuario */
    uiMessage: string | null;
    /** Indica si el error permite reintentar */
    retryable: boolean;
};

/**
 * Estado de error inicial (sin error).
 */
const NO_ERROR: VoiceErrorState = {
    code: null,
    message: null,
    uiMessage: null,
    retryable: false,
};

/**
 * Resultado del hook useVoiceChat.
 */
export type UseVoiceChatResult = {
    /** Lista de participantes en el chat de voz */
    participants: VoiceParticipant[];
    /** Indica si el usuario actual está en el chat de voz */
    joined: boolean;
    /** Indica si el usuario actual está muteado (local) */
    muted: boolean;
    /** Indica si el usuario actual está silenciado por el servidor */
    serverMuted: boolean;
    /** Rol del usuario actual en el chat de voz */
    selfRole: VoiceRole | null;
    /** Indica si se está procesando la unión al chat de voz */
    joining: boolean;
    /** Error si ocurrió alguno (deprecated, usar voiceError) */
    error: string | null;
    /** Estado de error estructurado */
    voiceError: VoiceErrorState;
    /** Unirse al chat de voz */
    joinVoice: () => void;
    /** Salir del chat de voz */
    leaveVoice: () => void;
    /** Alternar el estado de mute */
    toggleMute: () => void;
    /** Silenciar a un participante desde el servidor (solo host/cohost) */
    hostMute: (targetUserId: string) => void;
    /** Quitar silencio a un participante desde el servidor (solo host/cohost) */
    hostUnmute: (targetUserId: string) => void;
    /** Expulsar a un participante del chat de voz (solo host/cohost) */
    hostKick: (targetUserId: string) => void;
    /** Limpiar el estado de error */
    clearError: () => void;
};

/**
 * Verifica si la feature de voice chat está habilitada.
 */
function isVoiceEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return process.env.NEXT_PUBLIC_ENABLE_VOICE === "true";
}

/**
 * Resultado no-op cuando la feature está deshabilitada.
 */
const DISABLED_RESULT: UseVoiceChatResult = {
    participants: [],
    joined: false,
    muted: true,
    serverMuted: false,
    selfRole: null,
    joining: false,
    error: null,
    voiceError: NO_ERROR,
    joinVoice: () => {},
    leaveVoice: () => {},
    toggleMute: () => {},
    hostMute: () => {},
    hostUnmute: () => {},
    hostKick: () => {},
    clearError: () => {},
};

/**
 * Hook para gestionar el chat de voz en una sala.
 * 
 * Este hook maneja la señalización del chat de voz a través de Socket.IO,
 * sin implementar WebRTC ni audio real todavía.
 * 
 * @param roomId - ID de la sala
 * @param socket - Instancia del socket de la sala (compartido con useRoom)
 * @returns Estado y funciones para controlar el chat de voz
 */
export function useVoiceChat(
    roomId: string,
    socket: Socket | null
): UseVoiceChatResult {
    const { user } = useAuth();

    // Si la feature está deshabilitada, devolver resultado no-op
    const voiceEnabled = isVoiceEnabled();

    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [joined, setJoined] = useState(false);
    const [muted, setMuted] = useState(true);
    const [serverMuted, setServerMuted] = useState(false);
    const [selfRole, setSelfRole] = useState<VoiceRole | null>(null);
    const [joining, setJoining] = useState(false);
    const [voiceError, setVoiceError] = useState<VoiceErrorState>(NO_ERROR);

    // Refs para evitar closures stale
    const userIdRef = useRef<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Ref para el timeout de joinVoice (para poder cancelarlo en cleanup)
    const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ref para saber si el componente está montado
    const mountedRef = useRef(true);

    // Ref para leaveVoice (para poder llamarlo desde el handler de moderation)
    const leaveVoiceRef = useRef<() => void>(() => {});

    // Actualizar refs
    useEffect(() => {
        userIdRef.current = user?.id ?? null;
    }, [user?.id]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Cleanup del mounted ref y del timeout al desmontar
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            // Cancelar cualquier timeout pendiente al desmontar
            if (joinTimeoutRef.current) {
                clearTimeout(joinTimeoutRef.current);
                joinTimeoutRef.current = null;
            }
        };
    }, []);

    // Helper para limpiar todo el estado de voz
    const clearVoiceState = useCallback(() => {
        setParticipants([]);
        setJoined(false);
        setMuted(true);
        setServerMuted(false);
        setSelfRole(null);
        setJoining(false);
        setVoiceError(NO_ERROR);
        // Cancelar timeout pendiente
        if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
        }
    }, []);

    // Callback para limpiar el error manualmente
    const clearError = useCallback(() => {
        setVoiceError(NO_ERROR);
    }, []);

    // Procesar el estado de voz recibido del servidor
    const processVoiceState = useCallback(
        (payload: VoiceStatePayload) => {
            const currentUserId = userIdRef.current;

            const enrichedParticipants: VoiceParticipant[] =
                payload.participants.map((p) => ({
                    userId: p.userId,
                    displayName: p.displayName,
                    muted: p.muted,
                    serverMuted: p.serverMuted,
                    role: p.role,
                    isSelf: p.userId === currentUserId,
                }));

            setParticipants(enrichedParticipants);

            // Determinar si el usuario actual está en la llamada
            const selfParticipant = enrichedParticipants.find((p) => p.isSelf);
            setJoined(!!selfParticipant);

            // Sincronizar estado de mute y serverMuted con el servidor
            if (selfParticipant) {
                setMuted(selfParticipant.muted);
                setServerMuted(selfParticipant.serverMuted ?? false);
                setSelfRole(selfParticipant.role ?? null);
            }

            // Limpiar estado de joining y cancelar timeout si ya estamos unidos
            if (selfParticipant) {
                setJoining(false);
                if (joinTimeoutRef.current) {
                    clearTimeout(joinTimeoutRef.current);
                    joinTimeoutRef.current = null;
                }
            }
        },
        []
    );

    // Configurar listeners del socket
    useEffect(() => {
        if (!voiceEnabled || !socket) {
            console.log("[VoiceChat] listeners NOT attached", {
                voiceEnabled,
                hasSocket: !!socket,
            });
            return;
        }

        console.log("[VoiceChat] attaching socket listeners", {
            roomId,
            socketConnected: socket.connected,
        });

        const handleVoiceState = (payload: VoiceStatePayload) => {
            console.log("[VoiceChat] received voice:state", {
                roomId,
                participantCount: payload.participants.length,
                participants: payload.participants,
            });
            processVoiceState(payload);
        };

        const handleVoiceError = (payload: { message: string; code?: string }) => {
            console.log("[VoiceChat] received voice:error", { roomId, message: payload.message, code: payload.code });
            
            // Mapear el código de error del servidor a nuestros códigos
            let code: VoiceErrorCode = VoiceErrorCodes.VOICE_SERVER_ERROR;
            let uiMessage = payload.message;
            let retryable = true;

            // Detectar tipos de error específicos
            const msg = (payload.message || "").toLowerCase();
            if (msg.includes("no disponible") || msg.includes("unavailable")) {
                code = VoiceErrorCodes.VOICE_SERVICE_UNAVAILABLE;
                uiMessage = "El servicio de voz no está disponible. Intenta más tarde.";
                retryable = true;
            } else if (msg.includes("timeout") || msg.includes("tiempo de espera")) {
                code = VoiceErrorCodes.VOICE_JOIN_TIMEOUT;
                uiMessage = "No se pudo conectar al canal de voz. Intenta nuevamente.";
                retryable = true;
            } else if (msg.includes("expulsado") || msg.includes("kicked")) {
                code = VoiceErrorCodes.VOICE_KICKED;
                uiMessage = "Has sido expulsado del canal de voz.";
                retryable = false;
            }

            setVoiceError({ code, message: payload.message, uiMessage, retryable });
            setJoining(false);
            // Cancelar timeout pendiente cuando hay error
            if (joinTimeoutRef.current) {
                clearTimeout(joinTimeoutRef.current);
                joinTimeoutRef.current = null;
            }
        };

        const handleVoiceModeration = (payload: VoiceModerationPayload) => {
            debugLog("received voice:moderation", {
                roomId,
                type: payload.type,
                reason: payload.reason,
            });

            switch (payload.type) {
                case "SERVER_MUTE":
                    setServerMuted(true);
                    setVoiceError({
                        code: VoiceErrorCodes.VOICE_SERVER_MUTED,
                        message: "Server muted by host",
                        uiMessage: "Has sido silenciado por el host",
                        retryable: false,
                    });
                    break;
                case "SERVER_UNMUTE":
                    setServerMuted(false);
                    setVoiceError(NO_ERROR);
                    break;
                case "KICK":
                    // Usar ref para llamar leaveVoice
                    leaveVoiceRef.current();
                    setVoiceError({
                        code: VoiceErrorCodes.VOICE_KICKED,
                        message: payload.reason ?? "Kicked from voice chat",
                        uiMessage: payload.reason ?? "Has sido expulsado del chat de voz",
                        retryable: false,
                    });
                    break;
            }
        };

        socket.on("voice:state", handleVoiceState);
        socket.on("voice:error", handleVoiceError);
        socket.on("voice:moderation", handleVoiceModeration);

        return () => {
            socket.off("voice:state", handleVoiceState);
            socket.off("voice:error", handleVoiceError);
            socket.off("voice:moderation", handleVoiceModeration);
        };
    }, [voiceEnabled, socket, roomId, processVoiceState]);

    // Limpiar estado cuando cambia la sala o el socket cambia/desconecta
    useEffect(() => {
        if (!voiceEnabled) return;

        // Limpiar estado cuando socket cambia o se desconecta
        return () => {
            clearVoiceState();
        };
    }, [voiceEnabled, roomId, socket, clearVoiceState]);

    // Unirse al chat de voz
    const joinVoice = useCallback(() => {
        console.log("[VoiceChat] joinVoice called", {
            voiceEnabled,
            hasSocket: !!socketRef.current,
            socketConnected: socketRef.current?.connected,
            roomId,
            joining,
            joined,
        });

        if (!voiceEnabled) {
            console.log("[VoiceChat] joinVoice blocked: voiceEnabled=false");
            return;
        }

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            console.log("[VoiceChat] joinVoice blocked: socket not connected");
            setVoiceError({
                code: VoiceErrorCodes.VOICE_UNAVAILABLE,
                message: "Socket not connected",
                uiMessage: "No hay conexión con el servidor",
                retryable: true,
            });
            return;
        }

        if (joining || joined) {
            console.log("[VoiceChat] joinVoice blocked: already joining/joined", { joining, joined });
            return;
        }

        console.log("[VoiceChat] emitting voice:join", { roomId });
        setJoining(true);
        setVoiceError(NO_ERROR);

        currentSocket.emit("voice:join", { roomId });

        // Cancelar timeout previo si existía
        if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
        }

        // Timeout para limpiar el estado de joining si no hay respuesta
        joinTimeoutRef.current = setTimeout(() => {
            // Solo actualizar estado si el componente sigue montado
            if (!mountedRef.current) {
                joinTimeoutRef.current = null;
                return;
            }

            setJoining((current) => {
                if (current) {
                    debugLog("join timeout", { roomId });
                    setVoiceError({
                        code: VoiceErrorCodes.VOICE_JOIN_TIMEOUT,
                        message: "Join voice timeout",
                        uiMessage: "Tiempo de espera agotado al unirse",
                        retryable: true,
                    });
                    return false;
                }
                return current;
            });
            joinTimeoutRef.current = null;
        }, 10000);
    }, [voiceEnabled, roomId, joining, joined]);

    // Salir del chat de voz
    const leaveVoice = useCallback(() => {
        if (!voiceEnabled) return;

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            // Aun así, limpiar estado local
            setJoined(false);
            setMuted(true);
            return;
        }

        if (!joined) {
            debugLog("leave ignored: not joined", { roomId });
            return;
        }

        debugLog("emitting voice:leave", { roomId });
        currentSocket.emit("voice:leave", { roomId });

        // Actualización optimista
        setJoined(false);
        setMuted(true);
        setServerMuted(false);
        setSelfRole(null);
        
        // Cancelar timeout de join si estaba pendiente
        if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
        }
    }, [voiceEnabled, roomId, joined]);

    // Mantener ref de leaveVoice actualizado
    useEffect(() => {
        leaveVoiceRef.current = leaveVoice;
    }, [leaveVoice]);

    // Alternar mute
    const toggleMute = useCallback(() => {
        if (!voiceEnabled) return;

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            setVoiceError({
                code: VoiceErrorCodes.VOICE_UNAVAILABLE,
                message: "Socket not connected",
                uiMessage: "No hay conexión con el servidor",
                retryable: true,
            });
            return;
        }

        if (!joined) {
            debugLog("mute toggle ignored: not joined", { roomId });
            return;
        }

        // No permitir toggle mute si está silenciado por el servidor
        if (serverMuted) {
            debugLog("mute toggle blocked: server muted", { roomId });
            return;
        }

        const newMuted = !muted;
        debugLog("emitting voice:mute", { roomId, muted: newMuted });

        currentSocket.emit("voice:mute", { roomId, muted: newMuted });

        // Actualización optimista
        setMuted(newMuted);
    }, [voiceEnabled, roomId, joined, muted, serverMuted]);

    // Silenciar a un participante (solo host/cohost)
    const hostMute = useCallback((targetUserId: string) => {
        if (!voiceEnabled) return;

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            setVoiceError({
                code: VoiceErrorCodes.VOICE_UNAVAILABLE,
                message: "Socket not connected",
                uiMessage: "No hay conexión con el servidor",
                retryable: true,
            });
            return;
        }

        // Solo host/cohost pueden usar esta acción
        if (selfRole !== "host" && selfRole !== "cohost") {
            debugLog("host mute ignored: not host/cohost", { roomId, selfRole });
            return;
        }

        debugLog("emitting voice:host-mute", { roomId, targetUserId });
        currentSocket.emit("voice:host-mute", { roomId, targetUserId });
    }, [voiceEnabled, roomId, selfRole]);

    // Quitar silencio a un participante (solo host/cohost)
    const hostUnmute = useCallback((targetUserId: string) => {
        if (!voiceEnabled) return;

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            setVoiceError({
                code: VoiceErrorCodes.VOICE_UNAVAILABLE,
                message: "Socket not connected",
                uiMessage: "No hay conexión con el servidor",
                retryable: true,
            });
            return;
        }

        // Solo host/cohost pueden usar esta acción
        if (selfRole !== "host" && selfRole !== "cohost") {
            debugLog("host unmute ignored: not host/cohost", { roomId, selfRole });
            return;
        }

        debugLog("emitting voice:host-unmute", { roomId, targetUserId });
        currentSocket.emit("voice:host-unmute", { roomId, targetUserId });
    }, [voiceEnabled, roomId, selfRole]);

    // Expulsar a un participante del chat de voz (solo host/cohost)
    const hostKick = useCallback((targetUserId: string) => {
        if (!voiceEnabled) return;

        const currentSocket = socketRef.current;
        if (!currentSocket?.connected) {
            setVoiceError({
                code: VoiceErrorCodes.VOICE_UNAVAILABLE,
                message: "Socket not connected",
                uiMessage: "No hay conexión con el servidor",
                retryable: true,
            });
            return;
        }

        // Solo host/cohost pueden usar esta acción
        if (selfRole !== "host" && selfRole !== "cohost") {
            debugLog("host kick ignored: not host/cohost", { roomId, selfRole });
            return;
        }

        debugLog("emitting voice:host-kick", { roomId, targetUserId });
        currentSocket.emit("voice:host-kick", { roomId, targetUserId });
    }, [voiceEnabled, roomId, selfRole]);

    // Si la feature está deshabilitada, devolver resultado no-op
    if (!voiceEnabled) {
        return DISABLED_RESULT;
    }

    return {
        participants,
        joined,
        muted,
        serverMuted,
        selfRole,
        joining,
        error: voiceError.uiMessage,
        voiceError,
        joinVoice,
        leaveVoice,
        toggleMute,
        hostMute,
        hostUnmute,
        hostKick,
        clearError,
    };
}

export default useVoiceChat;
