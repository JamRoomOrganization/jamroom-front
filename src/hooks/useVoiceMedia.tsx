"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
 * Logger de debug para VoiceMedia.
 * Usa console.log para mayor visibilidad.
 */
function debugLog(
    action: string,
    data?: Record<string, unknown>
): void {
    if (!isDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    console.log(`[VoiceMedia][${timestamp}] ${action}`, data ?? "");
}

/**
 * Estado de permisos del micrófono.
 */
export type PermissionState = "idle" | "prompt" | "granted" | "denied" | "error";

/**
 * Resultado del hook useVoiceMedia.
 */
export type UseVoiceMediaResult = {
    /** Stream de audio local del usuario */
    localStream: MediaStream | null;
    /** Indica si el media está activo */
    mediaEnabled: boolean;
    /** Estado de permisos del micrófono */
    permissionState: PermissionState;
    /** Error si ocurrió alguno */
    error: string | null;
    /** Habilitar el micrófono */
    enableMedia: () => Promise<void>;
    /** Deshabilitar el micrófono */
    disableMedia: () => void;
};

/**
 * Opciones del hook useVoiceMedia.
 */
export type UseVoiceMediaOptions = {
    /** Override de la feature flag (por defecto lee NEXT_PUBLIC_ENABLE_VOICE_MEDIA) */
    enabledFlag?: boolean;
};

/**
 * Verifica si la feature de voice media está habilitada.
 */
function isVoiceMediaEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA === "true";
}

/**
 * Resultado no-op cuando la feature está deshabilitada.
 */
const DISABLED_RESULT: UseVoiceMediaResult = {
    localStream: null,
    mediaEnabled: false,
    permissionState: "idle",
    error: null,
    enableMedia: async () => {},
    disableMedia: () => {},
};

/**
 * Obtiene un mensaje de error amigable a partir de un error de getUserMedia.
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
        switch (error.name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
                return "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en tu navegador.";
            case "NotFoundError":
            case "DevicesNotFoundError":
                return "No se encontró ningún micrófono. Conecta un micrófono e inténtalo de nuevo.";
            case "NotReadableError":
            case "TrackStartError":
                return "No se pudo acceder al micrófono. Puede que otra aplicación lo esté usando.";
            case "OverconstrainedError":
                return "No se pudo configurar el micrófono con los parámetros solicitados.";
            case "AbortError":
                return "La solicitud de micrófono fue interrumpida.";
            case "SecurityError":
                return "El acceso al micrófono fue bloqueado por razones de seguridad.";
            default:
                return `Error de micrófono: ${error.message || error.name}`;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Error desconocido al acceder al micrófono.";
}

/**
 * Determina el estado de permiso basándose en el error.
 */
function getPermissionStateFromError(error: unknown): PermissionState {
    if (error instanceof DOMException) {
        if (
            error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError"
        ) {
            return "denied";
        }
    }
    return "error";
}

/**
 * Hook para gestionar el acceso al micrófono del usuario.
 * 
 * Este hook maneja la captura de audio del usuario a través de getUserMedia,
 * incluyendo solicitud de permisos, manejo de errores y limpieza de recursos.
 * 
 * @param options - Opciones de configuración
 * @returns Estado y funciones para controlar el acceso al micrófono
 */
export function useVoiceMedia(options?: UseVoiceMediaOptions): UseVoiceMediaResult {
    // Determinar si la feature está habilitada
    const enabledFlag = options?.enabledFlag;
    const mediaEnabled_flag = enabledFlag !== undefined ? enabledFlag : isVoiceMediaEnabled();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mediaEnabled, setMediaEnabled] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState>("idle");
    const [error, setError] = useState<string | null>(null);

    // Ref para saber si el componente está montado
    const mountedRef = useRef(true);

    // Ref para el stream actual (para cleanup)
    const streamRef = useRef<MediaStream | null>(null);

    // Ref para evitar llamadas concurrentes a enableMedia
    const enablingRef = useRef(false);

    // Cleanup del mounted ref al desmontar
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            // Limpiar el stream si está activo
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
                streamRef.current = null;
            }
        };
    }, []);

    /**
     * Para todas las pistas de un stream.
     */
    const stopStream = useCallback((stream: MediaStream | null) => {
        if (!stream) return;
        stream.getTracks().forEach((track) => {
            track.stop();
        });
    }, []);

    /**
     * Habilita el micrófono solicitando permisos al usuario.
     */
    const enableMedia = useCallback(async () => {
        // Si la feature no está habilitada, no hacer nada
        if (!mediaEnabled_flag) return;

        // Evitar llamadas concurrentes
        if (enablingRef.current) return;
        enablingRef.current = true;

        // Si ya está habilitado, no hacer nada
        if (streamRef.current && mediaEnabled) {
            enablingRef.current = false;
            return;
        }

        try {
            // Cambiar a estado "prompt" mientras esperamos
            if (mountedRef.current) {
                setPermissionState("prompt");
                setError(null);
            }

            debugLog("requesting microphone access");

            // Solicitar acceso al micrófono
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            // Verificar que el componente sigue montado
            if (!mountedRef.current) {
                // Si ya no está montado, parar el stream
                stopStream(stream);
                return;
            }

            debugLog("microphone access granted", {
                trackCount: stream.getAudioTracks().length,
            });

            // Guardar el stream
            streamRef.current = stream;
            setLocalStream(stream);
            setMediaEnabled(true);
            setPermissionState("granted");
            setError(null);
        } catch (err) {
            // Verificar que el componente sigue montado
            if (!mountedRef.current) return;

            const errorMessage = getErrorMessage(err);
            const permState = getPermissionStateFromError(err);

            debugLog("microphone access error", {
                errorName: err instanceof Error ? err.name : "unknown",
                permissionState: permState,
            });

            setPermissionState(permState);
            setError(errorMessage);
            setLocalStream(null);
            setMediaEnabled(false);
            streamRef.current = null;
        } finally {
            enablingRef.current = false;
        }
    }, [mediaEnabled_flag, mediaEnabled, stopStream]);

    /**
     * Deshabilita el micrófono y libera los recursos.
     */
    const disableMedia = useCallback(() => {
        // Si la feature no está habilitada, no hacer nada
        if (!mediaEnabled_flag) return;

        debugLog("disabling microphone");

        // Parar todas las pistas
        stopStream(streamRef.current);

        // Limpiar estado
        streamRef.current = null;

        if (mountedRef.current) {
            setLocalStream(null);
            setMediaEnabled(false);
            // No reseteamos permissionState para recordar el estado de permiso
            // Pero limpiamos el error
            setError(null);
        }
    }, [mediaEnabled_flag, stopStream]);

    // Si la feature está deshabilitada, devolver resultado no-op
    if (!mediaEnabled_flag) {
        return DISABLED_RESULT;
    }

    return {
        localStream,
        mediaEnabled,
        permissionState,
        error,
        enableMedia,
        disableMedia,
    };
}

export default useVoiceMedia;
