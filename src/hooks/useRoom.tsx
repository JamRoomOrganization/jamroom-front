"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const SYNC_SERVICE_URL =
    process.env.NEXT_PUBLIC_SYNC_SERVICE_URL || "http://localhost:3001";

export type RoomTrack = {
    id: string;
    title: string;
    artist?: string;
    artworkUrl?: string;
    source?: "audius" | "other";
};

export type RoomParticipant = {
    id: string;
    name: string;
    role?: string;
    roles?: string[];
    canControlPlayback?: boolean;
    canAddTracks?: boolean;
    canInvite?: boolean;
};

export type Room = {
    id: string;
    name: string;
    participants?: RoomParticipant[];
    queue: RoomTrack[];
};

type SyncPacket = {
    trackId?: string;
    playbackState?: "playing" | "paused";
    positionMs?: number;
};

type ControlError = {
    message: string;
};

export function useRoom(roomId: string) {
    const auth = useAuth();
    const user = auth?.user;
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Obtener accessToken desde localStorage
    const getAccessToken = useCallback(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("accessToken") || localStorage.getItem("jr_token");
        }
        return null;
    }, []);

    // 1) Carga de sala desde backend
    useEffect(() => {
        if (!roomId) return;

        let cancelled = false;

        async function loadRoom() {
            try {
                setLoading(true);
                setError(null);

                const res = await api.get<RoomTrack[]>(`/api/rooms/${roomId}/queue`, true);

                if (!cancelled) {
                    setRoom({
                        id: roomId,
                        name: roomId,
                        participants: [],
                        queue: res.data ?? [],
                    });
                }
            } catch (err) {
                console.error("[useRoom] error loading room", err);
                if (!cancelled) {
                    setRoom(null);
                    setError(err instanceof Error ? err.message : "Error desconocido al cargar la sala");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadRoom();

        return () => {
            cancelled = true;
        };
    }, [roomId]);

    // 2) Conexión a sync-service (Socket.IO)
    useEffect(() => {
        if (!roomId) return;

        const accessToken = getAccessToken();

        const socket = io(SYNC_SERVICE_URL, {
            transports: ["websocket"],
            auth: {
                token: accessToken,
                userId: user?.id || user?.email || "anon",
            },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[useRoom] Connected to sync-service");
            socket.emit("joinRoom", { roomId });
        });

        socket.on("syncPacket", (pkt: SyncPacket) => {
            console.log("[useRoom] syncPacket received", pkt);
            const audio = audioRef.current;
            if (!audio) {
                console.warn("[useRoom] No audio element available");
                return;
            }

            const { trackId, playbackState, positionMs } = pkt;

            // Cambiar fuente si cambió el track
            if (trackId && audio.src !== trackId) {
                console.log("[useRoom] Cambiando track a:", trackId);
                audio.src = trackId;
                audio.load(); // Forzar recarga del audio
            }

            // Posición
            if (typeof positionMs === "number") {
                const newTime = positionMs / 1000;
                console.log("[useRoom] Ajustando posición a:", newTime, "segundos");
                audio.currentTime = newTime;
            }

            // Play / Pause
            if (playbackState === "playing") {
                console.log("[useRoom] Reproduciendo...");
                audio
                    .play()
                    .then(() => {
                        console.log("[useRoom] Reproducción iniciada exitosamente");
                    })
                    .catch((err) => {
                        console.warn("[useRoom] Error en play (puede ser bloqueo de autoplay):", err);
                    });
            } else if (playbackState === "paused") {
                console.log("[useRoom] Pausando...");
                audio.pause();
            }
        });

        socket.on("controlError", (msg: ControlError) => {
            console.warn("[useRoom] controlError", msg);
        });

        socket.on("disconnect", () => {
            console.log("[useRoom] Disconnected from sync-service");
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, user, getAccessToken]);

    // 3) Cambiar de track con una URL de stream externa (Audius, etc.)
    const changeTrackFromExternalStream = useCallback(
        async (opts: {
            streamUrl: string;
            title?: string;
            artist?: string;
            artworkUrl?: string;
            source?: "audius" | "other";
        }) => {
            const { streamUrl, title, artist, artworkUrl, source } = opts;

            if (!streamUrl) return;

            const socket = socketRef.current;
            if (!socket) {
                console.warn("[useRoom] no socket for changeTrack");
                return;
            }

            // 1) Notificar al sync-service (todos los clientes se alinean)
            socket.emit("changeTrack", {
                roomId,
                trackId: streamUrl,
                startPositionMs: 0,
            });

            // 2) Actualizar estado local de la cola
            setRoom((prev) => {
                if (!prev) return prev;

                const newTrack: RoomTrack = {
                    id: streamUrl,
                    title: title || "Track externo",
                    artist,
                    artworkUrl,
                    source: source ?? "other",
                };

                return {
                    ...prev,
                    queue: [newTrack, ...(prev.queue ?? []).slice(1)],
                };
            });

            // 3) Forzar el audio local inmediatamente, sin esperar syncPacket
            if (audioRef.current) {
                audioRef.current.src = streamUrl;
                audioRef.current.currentTime = 0;
                audioRef.current
                    .play()
                    .catch(() => {
                        // otra vez autoplay, normal
                    });
            }
        },
        [roomId],
    );

    // 4) Skip sencillo
    const skipTrack = useCallback(() => {
        setRoom((prev) => {
            if (!prev || !prev.queue?.length) return prev;
            const [, ...rest] = prev.queue;
            return { ...prev, queue: rest };
        });

        const socket = socketRef.current;
        if (socket) {
            socket.emit("seek", {
                roomId,
                positionMs: 0,
            });
        }
    }, [roomId]);

    return {
        room,
        loading,
        error,
        skipTrack,
        changeTrackFromExternalStream,
        audioRef,
    };
}

