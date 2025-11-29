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
    const [socketStatus, setSocketStatus] =
        useState<SocketStatus>("disconnected");

    const socketRef = useRef<Socket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [playbackState, setPlaybackState] =
        useState<"playing" | "paused">("paused");
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const hasUserInteractedRef = useRef(false);

    const lastSyncStateRef = useRef<LastSyncState>({});
    const lastCommandRef = useRef<LastCommandState>({});

    const streamUrlCacheRef = useRef<Map<string, string>>(new Map());
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialSyncRef = useRef(false);
    const audioInitializedRef = useRef(false);
    const isLoadingTrackRef = useRef(false);
    const pendingPlaybackRef = useRef<{
        state: "playing" | "paused";
        position?: number;
    } | null>(null);

    // Latencia estimada (mediana RTT/2)
    const estimatedLatencyRef = useRef<number>(0);

    // Último seek local (para ignorar syncs que “pisen” el seek)
    const lastSeekTimeRef = useRef<number>(0);

    // Última acción local (play/pause/seek), para priorizar UX local
    const lastLocalActionRef = useRef<{
        type: "seek" | "play" | "pause" | null;
        timestamp: number;
    }>({ type: null, timestamp: 0 });

    const getAccessToken = useCallback(() => {
        if (typeof window === "undefined") return null;
        const jrToken = localStorage.getItem("jr_token");
        if (jrToken) return jrToken;
        const legacyAccessToken = localStorage.getItem("accessToken");
        if (legacyAccessToken) return legacyAccessToken;
        return null;
    }, []);

    // play() seguro: sincroniza estado de UI con el resultado real
    const safePlay = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
        try {
            await audio.play();

            if (!audio.paused) {
                setPlaybackState("playing");
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
                return true;
            }

            console.warn("[useRoom] audio.play() completó pero audio.paused === true");
            setPlaybackState("paused");
            return false;
        } catch (err: unknown) {
            const error = err as Error;
            console.error("[useRoom] Error en audio.play():", error.name, error.message);
            setPlaybackState("paused");

            if (error.name === "NotAllowedError") {
                setHasUserInteracted(false);
            }

            return false;
        }
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
        async (
            trackId: string,
            streamUrl: string,
            shouldPlay: boolean,
            positionMs?: number
        ) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] No hay ref de audio");
                return false;
            }

            // Evitar cargas concurrentes
            if (isLoadingTrackRef.current) {
                console.log(
                    "[useRoom] Carga en progreso, guardando estado pendiente de reproducción"
                );
                pendingPlaybackRef.current = {
                    state: shouldPlay ? "playing" : "paused",
                    position: positionMs,
                };
                return false;
            }

            isLoadingTrackRef.current = true;

            const loadTimeout = setTimeout(() => {
                if (isLoadingTrackRef.current) {
                    console.warn("[useRoom] Timeout de carga - liberando estado");
                    isLoadingTrackRef.current = false;
                }
            }, 8000);

            try {
                console.log("[useRoom] 🎵 Iniciando carga de track:", {
                    trackId,
                    shouldPlay,
                    positionMs,
                    hasInteracted: hasUserInteractedRef.current,
                });

                // Reset de audio antes de asignar nueva src
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
                    console.log("[useRoom] 🎶 Intentando reproducir (loadAndPlayTrack)");
                    const success = await safePlay(audio);

                    if (!success) {
                        console.warn(
                            "[useRoom] ⚠️ No se pudo reproducir, requiere interacción del usuario"
                        );
                        clearTimeout(loadTimeout);
                        return false;
                    }
                } else {
                    setPlaybackState("paused");
                }

                clearTimeout(loadTimeout);
                return true;
            } catch (err) {
                console.error("[useRoom] ❌ Error cargando/reproduciendo track:", err);
                clearTimeout(loadTimeout);
                return false;
            } finally {
                isLoadingTrackRef.current = false;

                // Si durante la carga llegó un estado pendiente (p.ej. un sync más fresco)
                if (pendingPlaybackRef.current) {
                    const pending = pendingPlaybackRef.current;
                    pendingPlaybackRef.current = null;
                    console.log("[useRoom] Procesando estado pendiente:", pending);

                    const audio = audioRef.current;
                    if (audio) {
                        if (typeof pending.position === "number") {
                            audio.currentTime = pending.position / 1000;
                        }

                        if (pending.state === "playing" && audio.paused) {
                            safePlay(audio).catch((err) => {
                                console.error(
                                    "[useRoom] Error reproduciendo estado pendiente:",
                                    err
                                );
                            });
                        } else if (pending.state === "paused" && !audio.paused) {
                            audio.pause();
                            setPlaybackState("paused");
                        }
                    }
                }
            }
        },
        [safePlay]
    );

    // Medir RTT sin bloquear joinRoom (se usará para compensación en syncs)
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

                const handler = ({
                                     clientTimestamp,
                                 }: {
                    clientTimestamp: number;
                    serverTimestamp: number;
                }) => {
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
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        if (!measurements.length) {
            console.warn("[useRoom] No se pudo medir RTT, usando 0");
            return 0;
        }

        measurements.sort((a, b) => a - b);
        const medianRTT = measurements[Math.floor(measurements.length / 2)];
        const latency = medianRTT / 2;

        console.log("[useRoom] RTT medido:", {
            measurements,
            medianRTT,
            estimatedLatency: latency,
        });

        return latency;
    }, []);

    // Persistencia de estado en localStorage (para join más fluido)
    useEffect(() => {
        if (!currentTrackId || !roomId) return;

        const STORAGE_KEY = `jamroom_state_${roomId}`;
        const stateToSave = {
            trackId: currentTrackId,
            positionMs: (audioRef.current?.currentTime || 0) * 1000,
            playbackState,
            timestamp: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log("[useRoom] 💾 Estado guardado en localStorage:", stateToSave);
    }, [currentTrackId, playbackState, roomId]);

    // Detectar primera interacción del usuario (para autoplay)
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

    // Cargar metadata de la sala + prebuffer optimista desde localStorage
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

        // Prebuffer optimista antes de socket
        const STORAGE_KEY = `jamroom_state_${roomId}`;
        const savedState = localStorage.getItem(STORAGE_KEY);

        if (savedState) {
            try {
                const {
                    trackId,
                    positionMs,
                    playbackState: savedPlaybackState,
                    timestamp,
                } = JSON.parse(savedState);

                if (Date.now() - timestamp < 600000 && trackId) {
                    console.log("[useRoom] 📥 Recuperando estado guardado:", {
                        trackId,
                        positionMs,
                    });

                    ensureStreamUrlForTrack(trackId)
                        .then((streamUrl) => {
                            const audio = audioRef.current;
                            if (!streamUrl || !audio) return;

                            audio.src = streamUrl;
                            audio.currentTime = positionMs / 1000;
                            setCurrentTrackId(trackId);

                            if (savedPlaybackState === "playing") {
                                console.log(
                                    "[useRoom] Estado guardado indica 'playing', esperando confirmación del servidor"
                                );
                            }
                        })
                        .catch((err) => {
                            console.error("[useRoom] Error en prebuffer optimista:", err);
                        });
                } else {
                    console.log("[useRoom] Estado guardado expirado o inválido, ignorando");
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (err) {
                console.error("[useRoom] Error cargando estado guardado:", err);
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        return () => {
            cancelled = true;
        };
    }, [roomId, ensureStreamUrlForTrack]);

    // Conexión y handlers de socket (SyncGateway)
    useEffect(() => {
        if (!roomId) return;

        const accessToken = getAccessToken();
        const userId = user?.id || user?.email || "anon";

        // Capturar el ref al inicio del efecto para usarlo en el cleanup
        const streamUrlCache = streamUrlCacheRef.current;

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

            // Emit joinRoom INMEDIATAMENTE para acelerar initialSync/fastSync
            const clientJoinTimestamp = Date.now();
            socket.emit("joinRoom", {
                roomId,
                room_id: roomId,
                userId,
                user_id: userId,
                clientJoinTimestamp,
            });
            console.log("[useRoom] joinRoom emitido");

            // Medir RTT EN PARALELO (para mejorar sync futura pero sin bloquear join)
            (async () => {
                try {
                    const latency = await measureRTT(socket);
                    estimatedLatencyRef.current = latency;
                    console.log("[useRoom] Latencia estimada (post-join):", latency, "ms");
                } catch (err) {
                    console.warn("[useRoom] Error midiendo latencia:", err);
                    estimatedLatencyRef.current = 0;
                }
            })();
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

        // fastSync: ACK de comandos rápidos y sync acelerado de nuevos usuarios
        socket.on("fastSync", async (pkt: {
            trackId?: string;
            streamUrl?: string;
            positionMs: number;
            playbackState?: "playing" | "paused";
            type?: "play" | "pause";
            serverTimeMs: number;
            originalClientTimestamp?: number;
            networkLatency?: number;
            serverProcessingMs?: number;
        }) => {
            console.log("[useRoom] ⚡ fastSync recibido:", pkt);

            const audio = audioRef.current;
            if (!audio) return;

            const now = Date.now();

            // Caso 1: ACK a fastCommand (play/pause)
            if (pkt.type && pkt.originalClientTimestamp) {
                const lastAction = lastLocalActionRef.current;

                // Si es respuesta a mi propio comando, ya hice optimistic update → ignorar
                if (lastAction.timestamp === pkt.originalClientTimestamp) {
                    console.log("[useRoom] Ignorando fastSync: es ACK de mi propio comando");
                    return;
                }

                const serverProcessingTime =
                    pkt.serverTimeMs - pkt.originalClientTimestamp;
                const networkLatency = now - pkt.serverTimeMs;
                const totalLatency = serverProcessingTime + networkLatency;

                console.log("[useRoom] Latencia medida (fastCommand):", {
                    serverProcessing: serverProcessingTime,
                    network: networkLatency,
                    total: totalLatency,
                });

                const adjustedPositionMs = pkt.positionMs + totalLatency;
                const targetPos = adjustedPositionMs / 1000;

                if (Math.abs(audio.currentTime - targetPos) > 0.5) {
                    audio.currentTime = targetPos;
                }

                if (pkt.type === "play" && audio.paused) {
                    const success = await safePlay(audio);
                    if (!success) {
                        console.warn("[useRoom] Autoplay bloqueado en fastSync");
                    }
                } else if (pkt.type === "pause" && !audio.paused) {
                    audio.pause();
                    setPlaybackState("paused");
                }

                setPlaybackState(pkt.type === "play" ? "playing" : "paused");

                console.log(
                    "[useRoom] ✓ fastSync (comando) aplicado en:",
                    Date.now() - now,
                    "ms"
                );
                return;
            }

            // Caso 2: Nuevo usuario con streamUrl ya resuelta
            if (pkt.trackId && pkt.streamUrl) {
                const {
                    trackId,
                    streamUrl,
                    positionMs,
                    playbackState: serverPlaybackState,
                    serverTimeMs,
                    networkLatency = 0,
                } = pkt;

                if (pkt.serverProcessingMs !== undefined) {
                    console.log("[useRoom] 📊 Métricas del servidor (fastSync nuevo usuario):", {
                        serverProcessing: pkt.serverProcessingMs,
                        networkLatency,
                        total: pkt.serverProcessingMs + networkLatency,
                    });
                }

                // Guardar en cache y reusar si initialSync llega después
                streamUrlCacheRef.current.set(trackId, streamUrl);

                // Compensar latencia total
                const clientReceiveTime = Date.now();
                const totalLatency = clientReceiveTime - serverTimeMs;
                const adjustedPositionMs = positionMs + totalLatency;

                console.log("[useRoom] Compensación de latencia fastSync (nuevo usuario):", {
                    original: positionMs,
                    adjusted: adjustedPositionMs,
                    latency: totalLatency,
                });

                // Si ya tenemos audio inicializado con el mismo track, solo ajustar
                if (audioInitializedRef.current && currentTrackId === trackId) {
                    const targetPos = adjustedPositionMs / 1000;
                    if (Math.abs(audio.currentTime - targetPos) > 0.5) {
                        audio.currentTime = targetPos;
                    }

                    if (serverPlaybackState === "playing" && audio.paused) {
                        await safePlay(audio);
                    } else if (serverPlaybackState === "paused" && !audio.paused) {
                        audio.pause();
                        setPlaybackState("paused");
                    }

                    initialSyncRef.current = true;
                    console.log(
                        "[useRoom] ✓ fastSync (nuevo usuario) aplicado sin recargar track"
                    );
                    return;
                }

                try {
                    // Cargar + reproducir usando el streamUrl ya resuelto
                    const shouldPlay = serverPlaybackState === "playing";
                    await loadAndPlayTrack(
                        trackId,
                        streamUrl,
                        shouldPlay,
                        adjustedPositionMs
                    );

                    initialSyncRef.current = true;
                    console.log(
                        "[useRoom] ✓ fastSync (nuevo usuario) aplicado en:",
                        Date.now() - clientReceiveTime,
                        "ms"
                    );
                } catch (err) {
                    console.error("[useRoom] Error en fastSync (nuevo usuario):", err);
                }

                return;
            }

            console.warn("[useRoom] fastSync en formato no reconocido, ignorando");
        });

        // initialSync: snapshot inicial de estado de sala
        socket.on("initialSync", async (pkt: SyncPacket & { version?: number }) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] initialSync ignorado: no hay ref de audio");
                return;
            }

            console.log("[useRoom] 🎯 initialSync recibido:", pkt);

            const {
                trackId,
                playbackState: newPlaybackState,
                positionMs,
                serverTimeMs,
                serverProcessingMs,
            } = pkt;

            if (serverProcessingMs !== undefined) {
                console.log("[useRoom] Servidor procesó initialSync en:", serverProcessingMs, "ms");
            }

            if (!trackId) {
                console.warn("[useRoom] initialSync sin trackId");
                return;
            }

            // Si fastSync ya inicializó este track, solo ajustar (evita doble load)
            if (initialSyncRef.current && audioInitializedRef.current && currentTrackId === trackId) {
                const latency = estimatedLatencyRef.current;
                const compensatedServerTime = (serverTimeMs || Date.now()) + latency;
                const localTime = Date.now();
                const timeDiff = compensatedServerTime - localTime;
                const adjustedPositionMs = (positionMs || 0) + Math.max(0, timeDiff);

                const targetPos = adjustedPositionMs / 1000;
                const diff = Math.abs(audio.currentTime - targetPos);

                if (diff > 0.5) {
                    console.log("[useRoom] Ajustando posición tras initialSync (ya inicializado):", {
                        targetPos,
                        currentPos: audio.currentTime,
                        diff,
                    });
                    audio.currentTime = targetPos;
                }

                if (newPlaybackState === "playing" && audio.paused) {
                    await safePlay(audio);
                } else if (newPlaybackState === "paused" && !audio.paused) {
                    audio.pause();
                    setPlaybackState("paused");
                }

                console.log("[useRoom] ✓ initialSync aplicado sin recargar track");
                return;
            }

            // Compensación de latencia con RTT medido
            const latency = estimatedLatencyRef.current;
            const compensatedServerTime = (serverTimeMs || Date.now()) + latency;
            const localTime = Date.now();
            const timeDiff = compensatedServerTime - localTime;
            const adjustedPositionMs = (positionMs || 0) + Math.max(0, timeDiff);

            console.log("[useRoom] Compensación de latencia initialSync:", {
                positionMs,
                adjustedPositionMs,
                latency,
                timeDiff,
            });

            // Resolver streamUrl (usando cache si fastSync ya lo trajo)
            let streamUrl =
                (trackId && streamUrlCacheRef.current.get(trackId)) || null;
            if (!streamUrl) {
                streamUrl = await ensureStreamUrlForTrack(trackId);
            }
            if (!streamUrl) {
                console.warn("[useRoom] No se pudo resolver streamUrl para initialSync");
                return;
            }

            const shouldPlay = newPlaybackState === "playing";
            await loadAndPlayTrack(trackId, streamUrl, shouldPlay, adjustedPositionMs);

            initialSyncRef.current = true;
            console.log("[useRoom] ✓ initialSync aplicado exitosamente");
        });

        // Evento prebuffer (si backend lo utiliza)
        socket.on(
            "prebuffer",
            async ({ trackId, estimatedStartMs }: { trackId: string; estimatedStartMs: number }) => {
                const audio = audioRef.current;
                if (!audio) return;

                console.log("[useRoom] 📦 prebuffer solicitado:", {
                    trackId,
                    estimatedStartMs,
                });

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
                        const timeout = setTimeout(
                            () => reject(new Error("Timeout prebuffer")),
                            3000
                        );

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

                    if (estimatedStartMs !== undefined && estimatedStartMs !== null) {
                        audio.currentTime = estimatedStartMs / 1000;
                    }

                    console.log("[useRoom] ✓ Prebuffer completado para:", trackId);
                } catch (err) {
                    console.error("[useRoom] Error en prebuffer:", err);
                }
            }
        );

        // syncPacket con compensación de latencia + protección frente a acciones locales recientes
        socket.on("syncPacket", async (pkt: SyncPacket) => {
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] syncPacket ignorado: no hay ref de audio");
                return;
            }

            const now = Date.now();
            const lastAction = lastLocalActionRef.current;
            const timeSinceAction = now - lastAction.timestamp;

            // Ignorar si hay seek local reciente
            if (lastAction.type === "seek" && timeSinceAction < 2000) {
                console.log(
                    "[useRoom] 🛡️ Ignorando syncPacket: seek local reciente",
                    timeSinceAction,
                    "ms"
                );
                return;
            }

            // Ignorar si acaba de haber play/pause local
            if (
                (lastAction.type === "play" || lastAction.type === "pause") &&
                timeSinceAction < 1000
            ) {
                console.log(
                    "[useRoom] 🛡️ Ignorando syncPacket: comando local reciente",
                    lastAction.type,
                    timeSinceAction,
                    "ms"
                );
                return;
            }

            const timeSinceLastSeek = now - lastSeekTimeRef.current;
            if (timeSinceLastSeek < 2000 && lastAction.type !== "seek") {
                console.log(
                    "[useRoom] Ignorando syncPacket: seek reciente (legacy)",
                    timeSinceLastSeek,
                    "ms"
                );
                return;
            }

            const {
                trackId,
                playbackState: newPlaybackState,
                positionMs,
                serverTimeMs,
            } = pkt;
            const last = lastSyncStateRef.current;

            const trackChanged = !!trackId && trackId !== last.trackId;
            const isInitialSync = !initialSyncRef.current;

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
                isLoading: isLoadingTrackRef.current,
            });

            if (isLoadingTrackRef.current) {
                console.log(
                    "[useRoom] Carga en progreso, guardando estado pendiente desde syncPacket"
                );
                if (newPlaybackState) {
                    pendingPlaybackRef.current = {
                        state: newPlaybackState,
                        position: adjustedPositionMs,
                    };
                }
                return;
            }

            let streamUrl: string | null = null;
            if (trackId) {
                streamUrl = streamUrlCacheRef.current.get(trackId) || null;
                if (!streamUrl) {
                    streamUrl = await ensureStreamUrlForTrack(trackId);
                }
                if (!streamUrl) {
                    console.warn(
                        "[useRoom] No se pudo resolver streamUrl para trackId en syncPacket",
                        trackId
                    );
                    return;
                }
            }

            if (trackId && streamUrl && (trackChanged || isInitialSync)) {
                const shouldPlay = newPlaybackState === "playing";
                await loadAndPlayTrack(
                    trackId,
                    streamUrl,
                    shouldPlay,
                    adjustedPositionMs
                );
                initialSyncRef.current = true;
            } else if (
                !trackChanged &&
                adjustedPositionMs !== undefined &&
                !isInitialSync
            ) {
                const targetPos = adjustedPositionMs / 1000;
                const currentPos = audio.currentTime;
                const diff = Math.abs(targetPos - currentPos);

                if (timeSinceLastSeek < 3000 && diff < 3) {
                    console.log(
                        "[useRoom] Ignorando corrección de drift: seek reciente (pequeño diff)"
                    );
                } else if (diff > 1.5) {
                    console.log("[useRoom] Corrigiendo drift detectado:", {
                        target: targetPos,
                        current: currentPos,
                        diff,
                    });
                    audio.currentTime = targetPos;
                }
            }

            if (newPlaybackState && audioInitializedRef.current) {
                if (newPlaybackState === "playing" && audio.paused) {
                    console.log("[useRoom] ▶️ Reproduciendo desde syncPacket");
                    const success = await safePlay(audio);
                    if (!success) {
                        console.log(
                            "[useRoom] No se pudo reproducir, esperando interacción del usuario"
                        );
                    }
                } else if (newPlaybackState === "paused" && !audio.paused) {
                    console.log("[useRoom] ⏸ Pausando desde syncPacket");
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
            streamUrlCache.clear();
            initialSyncRef.current = false;
            audioInitializedRef.current = false;
            isLoadingTrackRef.current = false;
            pendingPlaybackRef.current = null;
            lastSeekTimeRef.current = 0;
            estimatedLatencyRef.current = 0;
            lastLocalActionRef.current = { type: null, timestamp: 0 };
        };
    }, [
        roomId,
        user,
        getAccessToken,
        measureRTT,
        ensureStreamUrlForTrack,
        loadAndPlayTrack,
        safePlay,
        currentTrackId,
    ]);

    // Listener de errores de audio con auto-recuperación
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
                    console.log(
                        "[useRoom] Intentando recuperar reproducción tras error de audio"
                    );
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

    // Cambio de track desde un stream externo (Audius u otros)
    const changeTrackFromExternalStream = useCallback(
        async (opts: { trackId: string; streamUrl: string }) => {
            const { trackId, streamUrl } = opts;
            if (!trackId || !streamUrl) return;

            const socket = socketRef.current;
            if (!socket || socketStatus !== "connected") {
                console.warn(
                    "[useRoom] changeTrack ignorado: socket no conectado o no listo"
                );
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

    // Play/Pause optimista + fastCommand + compatibilidad con comandos legacy
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

            // Throttling agresivo para evitar spam
            if (
                lastCommandRef.current.type === commandType &&
                lastCommandRef.current.timestamp &&
                now - lastCommandRef.current.timestamp < 300
            ) {
                console.log("[useRoom] Comando ignorado: throttling activo");
                return;
            }

            lastCommandRef.current = {
                type: commandType,
                timestamp: now,
            };

            hasUserInteractedRef.current = true;
            setHasUserInteracted(true);

            // PASO 1: Optimistic UI (instantáneo)
            setPlaybackState(nextIsPlaying ? "playing" : "paused");

            if (audio) {
                if (nextIsPlaying && audio.paused) {
                    audio.play().catch((err) => {
                        console.error("[useRoom] Autoplay bloqueado:", err);
                        setPlaybackState("paused");
                    });
                } else if (!nextIsPlaying && !audio.paused) {
                    audio.pause();
                }
            }

            const currentPos = audio?.currentTime ?? 0;
            const positionMs = Math.floor(currentPos * 1000);

            // Marcar acción local para ignorar syncs inmediatos
            lastLocalActionRef.current = {
                type: nextIsPlaying ? "play" : "pause",
                timestamp: now,
            };

            // PASO 2: fastCommand
            console.log("[useRoom] Emitiendo fastCommand:", commandType);
            socket.emit("fastCommand", {
                type: commandType,
                roomId,
                positionMs,
                clientTimestamp: now,
                trackId: currentTrackId || undefined,
                userId,
            });

            // PASO 3: fallback legacy
            if (nextIsPlaying) {
                if (!currentTrackId) {
                    console.warn(
                        "[useRoom] emitPlayPause(play) ignorado: no hay currentTrackId"
                    );
                    return;
                }

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

    // Seek con actualización local inmediata + envío diferido al backend
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

            const now = Date.now();
            lastSeekTimeRef.current = now;
            lastLocalActionRef.current = {
                type: "seek",
                timestamp: now,
            };

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
            }, 100); // pequeño debounce para scrubbing más suave
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

    // Forzar reproducción respetando sync (útil para UI “Reintentar”)
    const forcePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) {
            console.warn("[useRoom] forcePlay: no hay ref de audio");
            return false;
        }

        if (isLoadingTrackRef.current) {
            console.log("[useRoom] forcePlay: esperando carga de track");
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        try {
            if (audio.src && audio.paused) {
                await audio.play();
                console.log("[useRoom] ✓ Reproducción forzada exitosa");
                hasUserInteractedRef.current = true;
                setHasUserInteracted(true);
                setPlaybackState("playing");

                emitPlayPause(true);

                return true;
            }

            console.warn("[useRoom] forcePlay: no hay track para reproducir");
            return false;
        } catch (err: unknown) {
            console.error("[useRoom] ✗ Error en forcePlay:", err);
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
