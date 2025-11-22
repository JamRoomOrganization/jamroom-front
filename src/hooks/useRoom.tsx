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

  const getAccessToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jr_token")
      );
    }
    return null;
  }, []);

  // 🔴 AQUÍ ES EL CAMBIO IMPORTANTE
  // 1) Carga de METADATA de la sala (nombre real) desde backend
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function loadRoom() {
      try {
        setLoading(true);
        setError(null);

        // NUEVO: pedimos /api/rooms/:roomId para obtener name
        const res = await api.get<{ id: string; name: string }>(
          `/api/rooms/${roomId}`,
          true
        );

        if (!cancelled) {
          setRoom((prev) => ({
            // si ya había algo (cola/sync), lo respetamos
            ...(prev ?? { id: roomId, queue: [], participants: [] }),
            id: res.data.id,
            name: res.data.name,
          }));
        }
      } catch (err: any) {
        console.error("[useRoom] error loading room metadata", err);

        if (!cancelled) {
          setError(
            err?.message || "Error desconocido al cargar la sala"
          );
          // fallback: al menos tener algo para que la UI no explote
          setRoom((prev) => ({
            ...(prev ?? { id: roomId, queue: [], participants: [] }),
            id: roomId,
            name: roomId, // si el backend falla, seguirás viendo el UUID
          }));
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

  // ⚠️ IMPORTANTE:
  // Ya NO cargamos la cola aquí. La cola "lógica" la sigues trayendo
  // con useRoomQueue en RoomPage. El Room.queue de este hook
  // lo usa solo el sync-service (Audius / sockets) cuando cambias track.

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

      if (trackId && audio.src !== trackId) {
        console.log("[useRoom] Cambiando track a:", trackId);
        audio.src = trackId;
        audio.load();
      }

      if (typeof positionMs === "number") {
        const newTime = positionMs / 1000;
        console.log(
          "[useRoom] Ajustando posición a:",
          newTime,
          "segundos"
        );
        audio.currentTime = newTime;
      }

      if (playbackState === "playing") {
        console.log("[useRoom] Reproduciendo...");
        audio
          .play()
          .then(() => {
            console.log(
              "[useRoom] Reproducción iniciada exitosamente"
            );
          })
          .catch((err) => {
            console.warn(
              "[useRoom] Error en play (puede ser bloqueo de autoplay):",
              err
            );
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

  // 3) Cambiar de track con stream externo
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

      socket.emit("changeTrack", {
        roomId,
        trackId: streamUrl,
        startPositionMs: 0,
      });

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

      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    },
    [roomId]
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


