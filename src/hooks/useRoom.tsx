// src/hooks/useRoom.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getAudiusStreamUrl } from "@/lib/audiusClient";

const SYNC_SERVICE_URL =
    process.env.NEXT_PUBLIC_SYNC_SERVICE_URL || "http://localhost:3001";

export type Room = {
    id: string;
    name: string;
};

type SyncPacket = {
    roomId?: string;
    serverTimeMs?: number;
    trackId?: string; // ID lógico Audius
    playbackState?: "playing" | "paused";
    positionMs?: number;
    version?: number;
};

type SocketStatus = "disconnected" | "connecting" | "connected" | "authError";

type LastSyncState = {
    trackId?: string;
    playbackState?: "playing" | "paused";
    positionMs?: number;
};

type LastCommandState = {
    type?: string;
    timestamp?: number;
};

function useRoom(roomId: string) {
    const { user } = useAuth();

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [socketStatus, setSocketStatus] = useState<SocketStatus>("disconnected");

    const socketRef = useRef<Socket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [playbackState, setPlaybackState] = useState<"playing" | "paused">("paused");
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null); // ID lógico Audius

    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const hasUserInteractedRef = useRef(false);

    const lastSyncStateRef = useRef<LastSyncState>({});
    const lastCommandRef = useRef<LastCommandState>({});

    const streamUrlCacheRef = useRef<Map<string, string>>(new Map());
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialSyncRef = useRef(false);
    const audioInitializedRef = useRef(false);

    // NUEVO: Ref para evitar cambios automáticos de track
    const preventAutoChangeRef = useRef(false);

    // 🆕 Ref para prevenir múltiples intentos de reproducción
    const isLoadingTrackRef = useRef(false);
    const pendingPlaybackRef = useRef<{ state: "playing" | "paused"; position?: number } | null>(null);

    // ------------------ helpers ------------------

    const getAccessToken = useCallback(() => {
        if (typeof window === "undefined") return null;

        const jrToken = localStorage.getItem("jr_token");
        if (jrToken) return jrToken;

        const legacyAccessToken = localStorage.getItem("accessToken");
        if (legacyAccessToken) return legacyAccessToken;

        return null;
    }, []);

    // Resolver streamUrl a partir del trackId lógico, con caché
    const ensureStreamUrlForTrack = useCallback(
        async (trackId: string): Promise<string | null> => {
            if (!trackId) return null;

            const cache = streamUrlCacheRef.current;
            if (cache.has(trackId)) {
                return cache.get(trackId)!;
            }

            try {
                console.log("[useRoom] Resolviendo streamUrl para trackId:", trackId);
                const url = await getAudiusStreamUrl(trackId);
                if (url) {
                    cache.set(trackId, url);
                }
                return url;
            } catch (err) {
                console.error("[useRoom] Error obteniendo stream URL", {
                    trackId,
                    error: err instanceof Error ? err.message : String(err),
                });
                return null;
            }
        },
        [] // ✅ Sin dependencias - función estable
    );

    // 🆕 Función mejorada para cargar y reproducir tracks
    const loadAndPlayTrack = useCallback(
        async (trackId: string, streamUrl: string, shouldPlay: boolean, positionMs?: number) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] No hay ref de audio");
                return false;
            }

            // ✅ Timeout automático para evitar bloqueos
            const loadTimeout = setTimeout(() => {
                if (isLoadingTrackRef.current) {
                    console.warn("[useRoom] ⚠️ Timeout de carga - liberando estado");
                    isLoadingTrackRef.current = false;
                }
            }, 8000); // 8 segundos máximo

            // Evitar múltiples cargas simultáneas
            if (isLoadingTrackRef.current) {
                console.log("[useRoom] ⏳ Ya hay una carga en progreso, guardando estado pendiente");
                clearTimeout(loadTimeout); // ✅ Limpiar timeout si hay cola
                pendingPlaybackRef.current = {
                    state: shouldPlay ? "playing" : "paused",
                    position: positionMs
                };
                return false;
            }

            try {
                isLoadingTrackRef.current = true;

                console.log("[useRoom] 🎵 Iniciando carga de track:", {
                    trackId,
                    shouldPlay,
                    positionMs,
                    hasInteracted: hasUserInteractedRef.current
                });

                // 1. Pausar y limpiar audio actual
                audio.pause();
                audio.currentTime = 0;

                // 2. Establecer nuevo source
                audio.src = streamUrl;
                setCurrentTrackId(trackId);

                // 3. Esperar a que el audio esté listo
                await new Promise<void>((resolve, reject) => {
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            audio.removeEventListener("canplay", onReady);
                            audio.removeEventListener("error", onError);
                            reject(new Error("Timeout cargando audio"));
                        }
                    }, 5000); // ✅ 5 segundos

                    const onReady = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            audio.removeEventListener("canplay", onReady);
                            audio.removeEventListener("error", onError);
                            resolve();
                        }
                    };

                    const onError = (e: Event) => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            audio.removeEventListener("canplay", onReady);
                            audio.removeEventListener("error", onError);
                            reject(e);
                        }
                    };

                    audio.addEventListener("canplay", onReady, { once: true });
                    audio.addEventListener("error", onError, { once: true });
                    audio.load();
                });

                console.log("[useRoom] ✓ Audio cargado exitosamente");

                // 4. Ajustar posición si se especificó
                if (typeof positionMs === "number") {
                    const targetPos = Math.max(0, positionMs / 1000);
                    audio.currentTime = targetPos;
                    console.log("[useRoom] Posición ajustada a:", targetPos);
                }

                audioInitializedRef.current = true;

                // 5. Reproducir si se requiere
                if (shouldPlay) {
                    console.log("[useRoom] 🎶 Intentando reproducir");
                    try {
                        await audio.play();
                        hasUserInteractedRef.current = true;
                        setHasUserInteracted(true);
                        setPlaybackState("playing");
                        console.log("[useRoom] ✓ Reproducción iniciada exitosamente");
                        clearTimeout(loadTimeout); // ✅ Limpiar timeout en éxito
                        return true;
                    } catch (err: any) {
                        if (err.name === "NotAllowedError") {
                            console.warn("[useRoom] ⚠ Requiere interacción del usuario");
                            setPlaybackState("paused");
                            clearTimeout(loadTimeout);
                            return false;
                        }
                        throw err;
                    }
                } else {
                    setPlaybackState("paused");
                    clearTimeout(loadTimeout);
                    return true;
                }
            } catch (err) {
                console.error("[useRoom] ❌ Error cargando/reproduciendo track:", err);
                clearTimeout(loadTimeout); // ✅ Siempre limpiar timeout
                return false;
            } finally {
                isLoadingTrackRef.current = false; // ✅ SIEMPRE liberar estado

                // Procesar estado pendiente si existe
                if (pendingPlaybackRef.current) {
                    const pending = pendingPlaybackRef.current;
                    pendingPlaybackRef.current = null;
                    console.log("[useRoom] 📝 Procesando estado pendiente:", pending);

                    if (pending.state === "playing") {
                        setTimeout(() => {
                            const audio = audioRef.current;
                            if (audio && audio.paused) {
                                if (pending.position !== undefined) {
                                    audio.currentTime = pending.position / 1000;
                                }
                                audio.play().catch(err => {
                                    console.error("[useRoom] Error reproduciendo estado pendiente:", err);
                                });
                            }
                        }, 100);
                    }
                }
            }
        },
        []
    );

    // ------------------ detectar interacción user (autoplay) ------------------

    useEffect(() => {
        const handleInteraction = () => {
            if (!hasUserInteractedRef.current) {
                console.log("[useRoom] Primera interacción detectada");
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
            }
        };

        window.addEventListener("click", handleInteraction);
        window.addEventListener("keydown", handleInteraction);
        window.addEventListener("touchstart", handleInteraction);
        window.addEventListener("mousedown", handleInteraction);

        return () => {
            window.removeEventListener("click", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
            window.removeEventListener("touchstart", handleInteraction);
            window.removeEventListener("mousedown", handleInteraction);
        };
    }, []);

    // ------------------ cargar metadata básica sala ------------------

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

    // ------------------ conexión socket.io ------------------

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
            transports: ["websocket", "polling"],
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

            socket.emit("joinRoom", {
                roomId,
                room_id: roomId,
                userId,
                user_id: userId,
            });

            console.log("[useRoom] joinRoom emitido");
        });

        socket.on("disconnect", (reason) => {
            console.log("[useRoom] Desconectado de sync-service", { reason });
            setSocketStatus("disconnected");
            initialSyncRef.current = false;
            audioInitializedRef.current = false;
            isLoadingTrackRef.current = false;
            pendingPlaybackRef.current = null;
        });

        socket.on("connect_error", (err) => {
            console.error("[useRoom] connect_error", err);
            setError(
                `Error de conexión: ${
                    err.message || "No se pudo conectar al servidor de sync"
                }`
            );
            setSocketStatus("disconnected");
        });

        socket.on("authError", (msg: { error?: string }) => {
            console.warn("[useRoom] authError", msg);
            setError(msg.error ?? "No tienes permisos para controlar esta sala");
            setSocketStatus("authError");
        });

        socket.on("controlError", (msg: { error?: string; action?: string }) => {
            console.warn("[useRoom] controlError", msg);
        });

        // 🆕 Handler mejorado de syncPacket
        socket.on("syncPacket", async (pkt: SyncPacket) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] syncPacket ignorado: no hay ref de audio");
                return;
            }

            const { trackId, playbackState: newPlaybackState, positionMs } = pkt;
            const last = lastSyncStateRef.current;

            const trackChanged = !!trackId && trackId !== last.trackId;
            const isInitialSync = !initialSyncRef.current;

            console.log("[useRoom] syncPacket recibido:", {
                trackId: pkt.trackId,
                playbackState: pkt.playbackState,
                positionMs: pkt.positionMs,
                isInitialSync,
                trackChanged,
                isLoading: isLoadingTrackRef.current
            });

            // Si hay una carga en progreso, guardar estado pendiente
            if (isLoadingTrackRef.current) {
                console.log("[useRoom] Carga en progreso, guardando estado pendiente");
                if (newPlaybackState) {
                    pendingPlaybackRef.current = {
                        state: newPlaybackState,
                        position: positionMs
                    };
                }
                return;
            }

            // Resolver streamUrl
            let streamUrl: string | null = null;
            if (trackId) {
                streamUrl = await ensureStreamUrlForTrack(trackId);
                if (!streamUrl) {
                    console.warn("[useRoom] No se pudo resolver streamUrl para trackId", trackId);
                    return;
                }
            }

            // CAMBIO DE TRACK
            if (trackId && streamUrl && (trackChanged || isInitialSync)) {
                const shouldPlay = newPlaybackState === "playing";
                await loadAndPlayTrack(trackId, streamUrl, shouldPlay, positionMs);
                initialSyncRef.current = true;
            }
            // AJUSTE DE POSICIÓN (sin cambiar track)
            else if (!trackChanged && typeof positionMs === "number" && !isInitialSync) {
                const targetPos = positionMs / 1000;
                const currentPos = audio.currentTime;
                const diff = Math.abs(targetPos - currentPos);

                if (diff > 1.5) {
                    console.log("[useRoom] ⏭ Ajustando posición:", targetPos);
                    audio.currentTime = targetPos;
                }
            }

            // CONTROL PLAY/PAUSE
            if (newPlaybackState && audioInitializedRef.current) {
                if (newPlaybackState === "playing" && audio.paused) {
                    console.log("[useRoom] ▶️ Reproduciendo");
                    try {
                        await audio.play();
                        hasUserInteractedRef.current = true;
                        setHasUserInteracted(true);
                        setPlaybackState("playing");
                    } catch (err: any) {
                        if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
                            console.error("[useRoom] Error al reproducir:", err);
                        }
                    }
                } else if (newPlaybackState === "paused" && !audio.paused) {
                    console.log("[useRoom] ⏸ Pausando");
                    audio.pause();
                    setPlaybackState("paused");
                }
            }

            // Actualizar estado local
            lastSyncStateRef.current = {
                trackId: trackId || last.trackId,
                playbackState: newPlaybackState || last.playbackState,
                positionMs: positionMs ?? last.positionMs,
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
            streamUrlCacheRef.current.clear();
            initialSyncRef.current = false;
            audioInitializedRef.current = false;
            isLoadingTrackRef.current = false;
            pendingPlaybackRef.current = null;
        };
    }, [roomId, user]); // ✅ SOLO roomId y user - NO funciones

    // ------------------ listener de error persistente para recuperación ------------------
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Handler de error robusto
        const handleError = (e: Event) => {
            console.error("[useRoom] Error de audio:", e);
            const target = e.target as HTMLAudioElement;

            if (target.error) {
                console.error("[useRoom] Error code:", target.error.code);
                console.error("[useRoom] Error message:", target.error.message);

                // Intentar recuperar la reproducción
                if (playbackState === "playing" && currentTrackId) {
                    console.log("[useRoom] Intentando recuperar reproducción tras error");
                    setTimeout(async () => {
                        try {
                            const streamUrl = await ensureStreamUrlForTrack(currentTrackId);
                            if (streamUrl) {
                                await loadAndPlayTrack(currentTrackId, streamUrl, true);
                                console.log("[useRoom] ✓ Reproducción recuperada");
                            }
                        } catch (err) {
                            console.error("[useRoom] No se pudo recuperar:", err);
                        }
                    }, 1000);
                }
            }
        };

        audio.addEventListener("error", handleError);

        return () => {
            audio.removeEventListener("error", handleError);
        };
    }, [playbackState, currentTrackId, ensureStreamUrlForTrack, loadAndPlayTrack]);

    // ------------------ emitir eventos de control ------------------

    const changeTrackFromExternalStream = useCallback(
        async (opts: { trackId: string; streamUrl: string }) => {
            const { trackId, streamUrl } = opts;
            if (!trackId || !streamUrl) return;

            const socket = socketRef.current;
            if (!socket || socketStatus !== "connected") {
                console.warn("[useRoom] changeTrack ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";

            console.log("[useRoom] 🎵 Cambiando track manualmente:", trackId);

            // cache local
            streamUrlCacheRef.current.set(trackId, streamUrl);

            await loadAndPlayTrack(trackId, streamUrl, true);

            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            // Emitir al servidor para sincronizar con todos
            socket.emit("changeTrack", {
                roomId,
                trackId,
                userId,
            });
        },
        [roomId, socketStatus, user, loadAndPlayTrack]
    );

    const emitPlayPause = useCallback(
        (nextIsPlaying: boolean) => {
            const socket = socketRef.current;
            const audio = audioRef.current;
            if (!socket || socketStatus !== "connected" || !roomId) {
                console.warn("[useRoom] emitPlayPause ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";

            const now = Date.now();
            const commandType = nextIsPlaying ? "play" : "pause";
            if (
                lastCommandRef.current.type === commandType &&
                lastCommandRef.current.timestamp &&
                now - lastCommandRef.current.timestamp < 200
            ) {
                console.warn("[useRoom] Comando duplicado ignorado:", commandType);
                return;
            }

            lastCommandRef.current = {
                type: commandType,
                timestamp: now,
            };

            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            if (nextIsPlaying) {
                if (!currentTrackId) {
                    console.warn(
                        "[useRoom] emitPlayPause(play) ignorado: no hay currentTrackId"
                    );
                    return;
                }

                const currentPos = audio?.currentTime ?? 0;
                const duration = audio?.duration ?? 0;

                let validPos = currentPos;
                if (duration > 0 && currentPos >= duration) {
                    validPos = 0;
                    if (audio) {
                        audio.currentTime = 0;
                    }
                } else if (currentPos < 0 || !isFinite(currentPos)) {
                    validPos = 0;
                    if (audio) {
                        audio.currentTime = 0;
                    }
                }

                const positionMs = Math.floor(validPos * 1000);

                console.log("[useRoom] Emitiendo play:", {
                    positionMs,
                    currentPos,
                    duration,
                    wasReset: validPos !== currentPos,
                    trackId: currentTrackId,
                });

                socket.emit("play", {
                    roomId,
                    room_id: roomId,
                    trackId: currentTrackId,
                    positionMs,
                    startPositionMs: positionMs,
                    userId,
                    user_id: userId,
                });
            } else {
                const currentPos = audio?.currentTime ?? 0;
                const duration = audio?.duration ?? 0;

                const validPos = Math.max(0, Math.min(currentPos, duration));
                const positionMs = Math.floor(validPos * 1000);

                console.log("[useRoom] Emitiendo pause:", {
                    positionMs,
                    currentPos,
                    duration,
                    isValid: currentPos === validPos,
                });

                socket.emit("pause", {
                    roomId,
                    room_id: roomId,
                    positionMs,
                    userId,
                    user_id: userId,
                });
            }
        },
        [roomId, socketStatus, user, currentTrackId]
    );

    const emitSeek = useCallback(
        (positionSeconds: number) => {
            const socket = socketRef.current;
            if (!socket || socketStatus !== "connected" || !roomId) {
                console.warn("[useRoom] emitSeek ignorado: socket no conectado");
                return;
            }

            const userId = user?.id || user?.email || "anon";
            const positionMs = Math.floor(positionSeconds * 1000);

            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = positionSeconds;
            }

            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }

            seekTimeoutRef.current = setTimeout(() => {
                console.log("[useRoom] Emitiendo seek:", positionMs);

                socket.emit("seek", {
                    roomId,
                    room_id: roomId,
                    positionMs,
                    startPositionMs: positionMs,
                    userId,
                    user_id: userId,
                });
            }, 100);
        },
        [roomId, socketStatus, user]
    );

    const emitSkip = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || socketStatus !== "connected" || !roomId) {
            console.warn("[useRoom] emitSkip ignorado: socket no conectado");
            return;
        }

        const userId = user?.id || user?.email || "anon";

        console.log("[useRoom] Emitiendo skip (seek a 0)");

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

    // 🆕 forcePlay mejorado
    const forcePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) {
            console.warn('[useRoom] forcePlay: no hay ref de audio');
            return false;
        }

        // Si estamos cargando un track, esperar
        if (isLoadingTrackRef.current) {
            console.log('[useRoom] forcePlay: esperando carga de track');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
            // Si hay un track cargado y pausado, reproducir
            if (audio.src && audio.paused) {
                await audio.play();
                console.log('[useRoom] ✓ Reproducción forzada exitosa');
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
                setPlaybackState("playing");

                // Notificar al servidor
                emitPlayPause(true);

                return true;
            }

            console.warn('[useRoom] forcePlay: no hay track para reproducir');
            return false;
        } catch (err: any) {
            console.error('[useRoom] ✗ Error en forcePlay:', err);
            return false;
        }
    }, [emitPlayPause]);

    return {
        room,
        loading,
        error,
        socketStatus,
        audioRef,
        playbackState,
        currentTrackId, // ID lógico Audius
        hasUserInteracted,
        changeTrackFromExternalStream,
        emitPlayPause,
        emitSeek,
        emitSkip,
        forcePlay,
    };
}

// 👈 Export por defecto y nombrado, para que cualquier import funcione
export default useRoom;
export { useRoom };
