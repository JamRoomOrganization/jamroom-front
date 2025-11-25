"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const SYNC_SERVICE_URL =
    process.env.NEXT_PUBLIC_SYNC_SERVICE_URL || "http://localhost:3001";

export type Room = {
    id: string;
    name: string;
};

type SyncPacket = {
    roomId?: string;
    serverTimeMs?: number;
    trackId?: string;
    playbackState?: "playing" | "paused";
    positionMs?: number;
    version?: number;
};

type SocketStatus = "disconnected" | "connecting" | "connected" | "authError";

export function useRoom(roomId: string) {
    const { user } = useAuth();

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [socketStatus, setSocketStatus] = useState<SocketStatus>("disconnected");

    const socketRef = useRef<Socket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [playbackState, setPlaybackState] = useState<"playing" | "paused">("paused");
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

    // Track si el usuario ha interactuado (para autoplay)
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const hasUserInteractedRef = useRef(false);

    const lastSyncStateRef = useRef<{
        trackId?: string;
        playbackState?: "playing" | "paused";
        positionMs?: number;
    }>({});

    const getAccessToken = useCallback(() => {
        if (typeof window === "undefined") return null;

        const jrToken = localStorage.getItem("jr_token");
        if (jrToken) return jrToken;

        const legacyAccessToken = localStorage.getItem("accessToken");
        if (legacyAccessToken) return legacyAccessToken;

        return null;
    }, []);

    // Detectar primera interacción del usuario
    useEffect(() => {
        const handleInteraction = () => {
            if (!hasUserInteractedRef.current) {
                console.log('[useRoom] Primera interacción detectada');
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
            }
        };

        // Detectar múltiples tipos de interacción
        window.addEventListener('click', handleInteraction, { once: false });
        window.addEventListener('keydown', handleInteraction, { once: false });
        window.addEventListener('touchstart', handleInteraction, { once: false });
        window.addEventListener('mousedown', handleInteraction, { once: false });

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('mousedown', handleInteraction);
        };
    }, []); // Sin dependencias para evitar re-crear listeners

    // Cargar metadata básica de la sala
    useEffect(() => {
        if (!roomId) return;
        let cancelled = false;

        async function loadRoom() {
            try {
                console.log("[useRoom] Cargando metadata de sala:", roomId);

                const response = await api.get<{ id: string; name: string }>(
                    `/api/rooms/${roomId}`,
                    true
                );

                if (!cancelled) {
                    console.log("[useRoom] Sala cargada:", response.data);
                    setRoom({
                        id: response.data.id || roomId,
                        name: response.data.name || roomId,
                    });
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("[useRoom] Error al cargar sala:", err);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Error desconocido al cargar sala"
                    );
                    setRoom({ id: roomId, name: roomId });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadRoom();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    // Conectar Socket.IO al sync-service
    useEffect(() => {
        if (!roomId) return;

        const accessToken = getAccessToken();
        const userId = user?.id || user?.email || "anon";

        setSocketStatus("connecting");

        console.log("[useRoom] Conectando a sync-service", {
            url: SYNC_SERVICE_URL,
            roomId,
            hasToken: !!accessToken,
            userId,
        });

        const socket = io(SYNC_SERVICE_URL, {
            withCredentials: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            transports: ['websocket', 'polling'], // Preferir websocket
            auth: {
                token: accessToken,
                accessToken,
                roomId,
                room_id: roomId,
                userId,
                user_id: userId,
            },
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[useRoom] Conectado a sync-service", {
                socketId: socket.id,
                roomId,
                transport: socket.io.engine.transport.name,
            });
            setSocketStatus("connected");
            setError(null);

            // Emitir joinRoom sin recargar la página
            socket.emit("joinRoom", {
                roomId,
                room_id: roomId,
                userId,
                user_id: userId,
            });

            console.log("[useRoom] joinRoom emitido sin recargar");
        });

        socket.on("disconnect", (reason) => {
            console.log("[useRoom] Desconectado de sync-service", { reason });
            setSocketStatus("disconnected");

            // No hacer nada más - evitar side effects que causen recargas
        });

        socket.on("connect_error", (err) => {
            console.error("[useRoom] connect_error", err);
            setError(
                `Error de conexión: ${err.message || "No se pudo conectar al servidor de sync"}`
            );
            setSocketStatus("disconnected");
        });

        socket.on("authError", (msg: { error?: string }) => {
            console.warn("[useRoom] authError", msg);
            setError(
                msg.error ?? "No tienes permisos para controlar esta sala"
            );
            setSocketStatus("authError");
        });

        socket.on("controlError", (msg: { error?: string; action?: string }) => {
            console.warn("[useRoom] controlError", msg);
        });

        // Handler de syncPacket - ÚNICA fuente de verdad del audio
        socket.on("syncPacket", (pkt: SyncPacket) => {
            console.log("[useRoom] syncPacket recibido:", {
                trackId: pkt.trackId,
                playbackState: pkt.playbackState,
                positionMs: pkt.positionMs,
                hasAudio: !!audioRef.current,
                hasUserInteracted: hasUserInteractedRef.current,
            });

            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] syncPacket ignorado: no hay ref de audio");
                return;
            }

            const { trackId, playbackState: newPlaybackState, positionMs } = pkt;
            const last = lastSyncStateRef.current;

            const trackChanged = trackId && trackId !== last.trackId;
            const playbackStateChanged = newPlaybackState && newPlaybackState !== last.playbackState;
            const hasPosition = typeof positionMs === "number" && Number.isFinite(positionMs);

            console.log("[useRoom] syncPacket análisis:", {
                trackChanged,
                playbackStateChanged,
                hasPosition,
                currentSrc: audio.src,
                newTrackId: trackId,
            });

            // 1. Cambio de track
            if (trackId && trackChanged) {
                console.log("[useRoom] syncPacket → cambiando track a:", trackId);

                // Pausar primero para evitar errores
                audio.pause();

                // Actualizar src del audio
                audio.src = trackId;
                audio.load();

                setCurrentTrackId(trackId);

                // Si viene con posición, ajustar cuando esté listo
                if (hasPosition) {
                    const targetPos = positionMs / 1000;
                    const handleLoadedMetadata = () => {
                        audio.currentTime = targetPos;
                        console.log("[useRoom] Posición inicial ajustada:", targetPos);
                        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    };
                    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
                }
            }

            // 2. Ajuste de posición (solo si NO cambió el track)
            if (!trackChanged && hasPosition) {
                const targetPos = positionMs / 1000;
                const currentPos = audio.currentTime;
                const diff = Math.abs(targetPos - currentPos);

                // Solo ajustar si la diferencia es significativa (> 1s)
                if (diff > 1.0) {
                    console.log("[useRoom] syncPacket → ajustando posición:", {
                        current: currentPos,
                        target: targetPos,
                        diff,
                    });
                    audio.currentTime = targetPos;
                }
            }

            // 3. Play/Pause (siempre al final, después de ajustar track y posición)
            if (newPlaybackState) {
                console.log("[useRoom] syncPacket → procesando playbackState:", {
                    newState: newPlaybackState,
                    changed: playbackStateChanged,
                    hasUserInteracted: hasUserInteractedRef.current,
                    currentPaused: audio.paused,
                });

                setPlaybackState(newPlaybackState);

                if (newPlaybackState === "playing") {
                    // Solo intentar play si el usuario ha interactuado
                    if (hasUserInteractedRef.current) {
                        if (audio.paused) {
                            console.log("[useRoom] syncPacket → llamando audio.play()");
                            audio.play().catch((err) => {
                                if (err.name === "NotAllowedError") {
                                    console.warn("[useRoom] Autoplay bloqueado. Requiere interacción del usuario.");
                                } else if (err.name === "AbortError") {
                                    console.warn("[useRoom] Play interrumpido (normal durante cambios)");
                                } else {
                                    console.error("[useRoom] Error al reproducir:", err);
                                }
                            });
                        } else {
                            console.log("[useRoom] syncPacket → audio ya está reproduciendo");
                        }
                    } else {
                        console.warn("[useRoom] No se puede reproducir: usuario no ha interactuado. Esperando click...");
                    }
                } else if (newPlaybackState === "paused") {
                    if (!audio.paused) {
                        console.log("[useRoom] syncPacket → llamando audio.pause()");
                        audio.pause();
                    } else {
                        console.log("[useRoom] syncPacket → audio ya está pausado");
                    }
                }
            }

            // Actualizar referencia del último estado
            lastSyncStateRef.current = {
                trackId: trackId || last.trackId,
                playbackState: newPlaybackState || last.playbackState,
                positionMs: hasPosition ? positionMs : last.positionMs,
            };
        });

        return () => {
            console.log("[useRoom] Cleanup: Desconectando socket");
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setSocketStatus("disconnected");
            lastSyncStateRef.current = {};
            setPlaybackState("paused");
            setCurrentTrackId(null);
        };
    }, [roomId, user, getAccessToken]); // Removido hasUserInteracted para evitar re-crear socket

    // Emitir cambio de track al servidor
    const changeTrackFromExternalStream = useCallback(
        async (opts: { streamUrl: string }) => {
            const { streamUrl } = opts;
            if (!streamUrl) return;

            const socket = socketRef.current;
            if (!socket || socketStatus !== "connected") {
                console.warn("[useRoom] changeTrack ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";

            console.log("[useRoom] Emitiendo changeTrack:", streamUrl);

            // Marcar que el usuario ha interactuado
            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            socket.emit("changeTrack", {
                roomId,
                room_id: roomId,
                trackId: streamUrl,
                track_id: streamUrl,
                userId,
                user_id: userId,
            });
        },
        [roomId, socketStatus, user]
    );

    // Emitir play/pause al servidor
    const emitPlayPause = useCallback(
        (nextIsPlaying: boolean) => {
            const socket = socketRef.current;
            const audio = audioRef.current;
            if (!socket || socketStatus !== "connected" || !roomId) {
                console.warn("[useRoom] emitPlayPause ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";

            // Marcar que el usuario ha interactuado
            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            if (nextIsPlaying) {
                const positionMs = Math.floor((audio?.currentTime ?? 0) * 1000);
                console.log("[useRoom] Emitiendo play:", positionMs);

                socket.emit("play", {
                    roomId,
                    room_id: roomId,
                    positionMs,
                    startPositionMs: positionMs,
                    userId,
                    user_id: userId,
                });
            } else {
                const positionMs = Math.floor((audio?.currentTime ?? 0) * 1000);
                console.log("[useRoom] Emitiendo pause:", positionMs);

                socket.emit("pause", {
                    roomId,
                    room_id: roomId,
                    positionMs,
                    userId,
                    user_id: userId,
                });
            }
        },
        [roomId, socketStatus, user]
    );

    // Emitir seek al servidor
    const emitSeek = useCallback(
        (positionSeconds: number) => {
            const socket = socketRef.current;
            if (!socket || socketStatus !== "connected" || !roomId) {
                console.warn("[useRoom] emitSeek ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";
            const positionMs = Math.floor(positionSeconds * 1000);

            console.log("[useRoom] Emitiendo seek:", positionMs);

            // Marcar que el usuario ha interactuado
            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            socket.emit("seek", {
                roomId,
                room_id: roomId,
                positionMs,
                startPositionMs: positionMs,
                userId,
                user_id: userId,
            });
        },
        [roomId, socketStatus, user]
    );

    // Emitir skip al servidor
    const emitSkip = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || socketStatus !== "connected" || !roomId) {
            console.warn("[useRoom] emitSkip ignorado: socket no conectado");
            return;
        }

        const userId = user?.id || user?.email || "anon";

        console.log("[useRoom] Emitiendo skip");

        // Marcar que el usuario ha interactuado
        hasUserInteractedRef.current = true;
        setHasUserInteracted(true);

        socket.emit("seek", {
            roomId,
            room_id: roomId,
            positionMs: 0,
            startPositionMs: 0,
            userId,
            user_id: userId,
        });
    }, [roomId, socketStatus, user]);

    return {
        room,
        loading,
        error,
        socketStatus,
        audioRef,
        playbackState,
        currentTrackId,
        hasUserInteracted,
        changeTrackFromExternalStream,
        emitPlayPause,
        emitSeek,
        emitSkip,
    };
}

