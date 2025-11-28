// src/hooks/useRoom.tsx
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
    trackId?: string;
    playbackState?: "playing" | "paused";
    positionMs?: number;
    version?: number;
    serverProcessingMs?: number;
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
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const hasUserInteractedRef = useRef(false);

    const lastSyncStateRef = useRef<LastSyncState>({});
    const lastCommandRef = useRef<LastCommandState>({});

    const streamUrlCacheRef = useRef<Map<string, string>>(new Map());
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialSyncRef = useRef(false);
    const audioInitializedRef = useRef(false);
    const preventAutoChangeRef = useRef(false);
    const isLoadingTrackRef = useRef(false);
    const pendingPlaybackRef = useRef<{ state: "playing" | "paused"; position?: number } | null>(null);

    // 🆕 Ref para almacenar latencia estimada
    const estimatedLatencyRef = useRef<number>(0);


    const getAccessToken = useCallback(() => {
        if (typeof window === "undefined") return null;
        const jrToken = localStorage.getItem("jr_token");
        if (jrToken) return jrToken;
        const legacyAccessToken = localStorage.getItem("accessToken");
        if (legacyAccessToken) return legacyAccessToken;
        return null;
    }, []);

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
        []
    );

    const loadAndPlayTrack = useCallback(
        async (trackId: string, streamUrl: string, shouldPlay: boolean, positionMs?: number) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] No hay ref de audio");
                return false;
            }

            const loadTimeout = setTimeout(() => {
                if (isLoadingTrackRef.current) {
                    console.warn("[useRoom] Timeout de carga - liberando estado");
                    isLoadingTrackRef.current = false;
                }
            }, 8000);

            if (isLoadingTrackRef.current) {
                console.log("[useRoom] ⏳ Ya hay una carga en progreso, guardando estado pendiente");
                clearTimeout(loadTimeout);
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

                audio.pause();
                audio.currentTime = 0;
                audio.src = streamUrl;
                setCurrentTrackId(trackId);

                await new Promise<void>((resolve, reject) => {
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            audio.removeEventListener("canplay", onReady);
                            audio.removeEventListener("error", onError);
                            reject(new Error("Timeout cargando audio"));
                        }
                    }, 5000);

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

                if (typeof positionMs === "number") {
                    const targetPos = Math.max(0, positionMs / 1000);
                    audio.currentTime = targetPos;
                    console.log("[useRoom] Posición ajustada a:", targetPos);
                }

                audioInitializedRef.current = true;

                if (shouldPlay) {
                    console.log("[useRoom] 🎶 Intentando reproducir");
                    try {
                        await audio.play();
                        hasUserInteractedRef.current = true;
                        setHasUserInteracted(true);
                        setPlaybackState("playing");
                        console.log("[useRoom] ✓ Reproducción iniciada exitosamente");
                        clearTimeout(loadTimeout);
                        return true;
                    } catch (err: unknown) {
                        const error = err as { name?: string };
                        if (error.name === "NotAllowedError") {
                            console.warn("[useRoom]  Requiere interacción del usuario");
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
                clearTimeout(loadTimeout);
                return false;
            } finally {
                isLoadingTrackRef.current = false;

                if (pendingPlaybackRef.current) {
                    const pending = pendingPlaybackRef.current;
                    pendingPlaybackRef.current = null;
                    console.log("[useRoom]  Procesando estado pendiente:", pending);

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

    // 🆕 Función para medir RTT
    const measureRTT = useCallback(async (socket: Socket): Promise<number> => {
        const measurements: number[] = [];

        for (let i = 0; i < 3; i++) {
            const t0 = Date.now();

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn("[useRoom] measureLatency timeout");
                    resolve();
                }, 2000);

                socket.emit("measureLatency", { clientTimestamp: t0 });

                const handler = ({ clientTimestamp, serverTimestamp }: { clientTimestamp: number; serverTimestamp: number }) => {
                    clearTimeout(timeout);
                    const t1 = Date.now();
                    const rtt = t1 - clientTimestamp;
                    measurements.push(rtt);
                    socket.off("latencyResponse", handler);
                    resolve();
                };

                socket.on("latencyResponse", handler);
            });

            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (measurements.length === 0) {
            console.warn("[useRoom] No se pudo medir RTT, usando 0");
            return 0;
        }

        measurements.sort((a, b) => a - b);
        const medianRTT = measurements[Math.floor(measurements.length / 2)];
        const latency = medianRTT / 2;

        console.log("[useRoom] RTT medido:", {
            measurements,
            medianRTT,
            estimatedLatency: latency
        });

        return latency;
    }, []);

    // ------------------ detectar interacción user ------------------

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

        socket.on("connect", async () => {
            console.log("[useRoom] Conectado a sync-service", {
                socketId: socket.id,
                roomId,
                transport: socket.io.engine.transport.name,
            });
            setSocketStatus("connected");
            setError(null);

            // 🆕 Medir latencia al conectar
            try {
                const latency = await measureRTT(socket);
                estimatedLatencyRef.current = latency;
                console.log("[useRoom] Latencia estimada:", latency, "ms");
            } catch (err) {
                console.warn("[useRoom] Error midiendo latencia:", err);
                estimatedLatencyRef.current = 0;
            }

            // 🆕 Enviar timestamp del cliente para métricas
            socket.emit("joinRoom", {
                roomId,
                room_id: roomId,
                userId,
                user_id: userId,
                clientJoinTimestamp: Date.now(),
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

        // 🆕 Handler de initialSync (prioridad sobre syncPacket)
        socket.on("initialSync", async (pkt: SyncPacket & { version?: number }) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] initialSync ignorado: no hay ref de audio");
                return;
            }

            console.log("[useRoom] 🎯 initialSync recibido:", pkt);

            const { trackId, playbackState: newPlaybackState, positionMs, serverTimeMs, serverProcessingMs } = pkt;

            // Log de métricas del servidor
            if (serverProcessingMs !== undefined) {
                console.log("[useRoom] Servidor procesó initialSync en:", serverProcessingMs, "ms");
            }

            if (!trackId) {
                console.warn("[useRoom] initialSync sin trackId");
                return;
            }

            // 🆕 Compensar latencia de red
            const latency = estimatedLatencyRef.current;
            const compensatedServerTime = (serverTimeMs || Date.now()) + latency;
            const localTime = Date.now();
            const timeDiff = compensatedServerTime - localTime;
            const adjustedPositionMs = (positionMs || 0) + Math.max(0, timeDiff);

            console.log("[useRoom] Compensación de latencia:", {
                positionMs,
                adjustedPositionMs,
                latency,
                timeDiff
            });

            // Resolver streamUrl
            const streamUrl = await ensureStreamUrlForTrack(trackId);
            if (!streamUrl) {
                console.warn("[useRoom] No se pudo resolver streamUrl para initialSync");
                return;
            }

            // Cargar y reproducir inmediatamente
            const shouldPlay = newPlaybackState === "playing";
            await loadAndPlayTrack(trackId, streamUrl, shouldPlay, adjustedPositionMs);

            initialSyncRef.current = true;

            console.log("[useRoom] ✓ initialSync aplicado exitosamente");
        });

        // 🆕 Handler de prebuffer
        socket.on("prebuffer", async ({ trackId, estimatedStartMs }: { trackId: string; estimatedStartMs: number }) => {
            const audio = audioRef.current;
            if (!audio) return;

            console.log("[useRoom] 📦 prebuffer solicitado:", { trackId, estimatedStartMs });

            try {
                const streamUrl = await ensureStreamUrlForTrack(trackId);
                if (!streamUrl) {
                    console.warn("[useRoom] No se pudo prebuffer track:", trackId);
                    return;
                }

                audio.pause();
                audio.src = streamUrl;
                setCurrentTrackId(trackId);

                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("Timeout prebuffer")), 3000);

                    const onReady = () => {
                        clearTimeout(timeout);
                        audio.removeEventListener("canplay", onReady);
                        audio.removeEventListener("error", onError);
                        resolve();
                    };

                    const onError = (e: Event) => {
                        clearTimeout(timeout);
                        audio.removeEventListener("canplay", onReady);
                        audio.removeEventListener("error", onError);
                        reject(e);
                    };

                    audio.addEventListener("canplay", onReady, { once: true });
                    audio.addEventListener("error", onError, { once: true });
                    audio.load();
                });

                if (typeof estimatedStartMs === "number") {
                    audio.currentTime = estimatedStartMs / 1000;
                }

                console.log("[useRoom] ✓ Prebuffer completado para:", trackId);
            } catch (err) {
                console.error("[useRoom] Error en prebuffer:", err);
            }
        });

        // Handler de syncPacket (mejorado con compensación)
        socket.on("syncPacket", async (pkt: SyncPacket) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] syncPacket ignorado: no hay ref de audio");
                return;
            }

            const { trackId, playbackState: newPlaybackState, positionMs, serverTimeMs } = pkt;
            const last = lastSyncStateRef.current;

            const trackChanged = !!trackId && trackId !== last.trackId;
            const isInitialSync = !initialSyncRef.current;

            // 🆕 Compensar latencia de red
            const latency = estimatedLatencyRef.current;
            const compensatedServerTime = (serverTimeMs || Date.now()) + latency;
            const localTime = Date.now();
            const timeDiff = compensatedServerTime - localTime;
            const adjustedPositionMs = (positionMs || 0) + Math.max(0, timeDiff);

            console.log("[useRoom] syncPacket recibido:", {
                trackId: pkt.trackId,
                playbackState: pkt.playbackState,
                positionMs: pkt.positionMs,
                adjustedPositionMs,
                latency,
                timeDiff,
                isInitialSync,
                trackChanged,
                isLoading: isLoadingTrackRef.current
            });

            if (isLoadingTrackRef.current) {
                console.log("[useRoom] Carga en progreso, guardando estado pendiente");
                if (newPlaybackState) {
                    pendingPlaybackRef.current = {
                        state: newPlaybackState,
                        position: adjustedPositionMs
                    };
                }
                return;
            }

            let streamUrl: string | null = null;
            if (trackId) {
                streamUrl = await ensureStreamUrlForTrack(trackId);
                if (!streamUrl) {
                    console.warn("[useRoom] No se pudo resolver streamUrl para trackId", trackId);
                    return;
                }
            }

            if (trackId && streamUrl && (trackChanged || isInitialSync)) {
                const shouldPlay = newPlaybackState === "playing";
                await loadAndPlayTrack(trackId, streamUrl, shouldPlay, adjustedPositionMs);
                initialSyncRef.current = true;
            }
            else if (!trackChanged && typeof adjustedPositionMs === "number" && !isInitialSync) {
                const targetPos = adjustedPositionMs / 1000;
                const currentPos = audio.currentTime;
                const diff = Math.abs(targetPos - currentPos);

                if (diff > 1.5) {
                    console.log("[useRoom] ⏭ Ajustando posición:", targetPos);
                    audio.currentTime = targetPos;
                }
            }

            if (newPlaybackState && audioInitializedRef.current) {
                if (newPlaybackState === "playing" && audio.paused) {
                    console.log("[useRoom]  Reproduciendo");
                    try {
                        await audio.play();
                        hasUserInteractedRef.current = true;
                        setHasUserInteracted(true);
                        setPlaybackState("playing");
                    } catch (err: unknown) {
                        const error = err as { name?: string };
                        if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
                            console.error("[useRoom] Error al reproducir:", err);
                        }
                    }
                } else if (newPlaybackState === "paused" && !audio.paused) {
                    console.log("[useRoom] ⏸ Pausando");
                    audio.pause();
                    setPlaybackState("paused");
                }
            }

            lastSyncStateRef.current = {
                trackId: trackId || last.trackId,
                playbackState: newPlaybackState || last.playbackState,
                positionMs: adjustedPositionMs ?? last.positionMs,
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
    }, [roomId, user, getAccessToken, measureRTT, ensureStreamUrlForTrack, loadAndPlayTrack]);

    // ------------------ listener de error persistente ------------------
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleError = (e: Event) => {
            console.error("[useRoom] Error de audio:", e);
            const target = e.target as HTMLAudioElement;

            if (target.error) {
                console.error("[useRoom] Error code:", target.error.code);
                console.error("[useRoom] Error message:", target.error.message);

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

            streamUrlCacheRef.current.set(trackId, streamUrl);

            await loadAndPlayTrack(trackId, streamUrl, true);

            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

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

    const forcePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) {
            console.warn('[useRoom] forcePlay: no hay ref de audio');
            return false;
        }

        if (isLoadingTrackRef.current) {
            console.log('[useRoom] forcePlay: esperando carga de track');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
            if (audio.src && audio.paused) {
                await audio.play();
                console.log('[useRoom] ✓ Reproducción forzada exitosa');
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
                setPlaybackState("playing");

                emitPlayPause(true);

                return true;
            }

            console.warn('[useRoom] forcePlay: no hay track para reproducir');
            return false;
        } catch (err: unknown) {
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
        currentTrackId,
        hasUserInteracted,
        changeTrackFromExternalStream,
        emitPlayPause,
        emitSeek,
        emitSkip,
        forcePlay,
    };
}

export default useRoom;
export { useRoom };
