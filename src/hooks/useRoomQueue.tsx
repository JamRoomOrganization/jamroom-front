"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

type RoomQueueItem = {
  id: string;
  room_id: string;
  track_id: string;
  title: string | null;
  added_by: string;
  added_at: string;
  position: number;
};

type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  cover_url?: string;
};

type UseRoomQueueResult = {
  queue: Track[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addTrack: (trackId: string, title?: string) => Promise<void>;
  skipTrack: () => Promise<void>;
  removeTrack: (entryId: string) => Promise<void>;
};

export function useRoomQueue(roomId: string) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        // 1) Pide el tipo correcto al wrapper de API
        const res = await api.get<RoomQueueItem[]>(`/api/rooms/${roomId}/queue`, true);
    
        // 2) Extrae el data (que es el array real)
        const data = res.data ?? [];
    
        // 3) Transforma la cola
        const transformedQueue = data.map((item) => ({
          id: item.track_id,
          title: item.title ?? "Título desconocido",
        }));
    
        setQueue(transformedQueue);
      } catch (err) {
        console.error("[useRoomQueue] error fetching queue", err);
        setError(
          err instanceof Error ? err.message : "Error desconocido al cargar la cola",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, [roomId]);

  const addTrack = async (trackId: string, title: string = "Nueva Canción") => {
    try {
      const newTrack: Track = {
        id: trackId,
        title,
        artist: "",
        duration: 240,  // Duración predeterminada
        cover_url: "",  // URL vacía
      };

      setQueue((prevQueue) => [...prevQueue, newTrack]);
      await api.post(`/api/rooms/${roomId}/queue`, { trackId, title }, true); 
    } catch (err: any) {
      setError(err?.message || "Error al agregar la canción.");
    }
  };

  const skipTrack = async () => {
    try {
      const newQueue = queue.slice(1); 
      setQueue(newQueue);

      await api.post(`/api/rooms/${roomId}/queue/skip`, {}, true);
    } catch (err: any) {
      setError(err?.message || "Error al saltar la canción.");
    }
  };

  return { queue, loading, error, addTrack, skipTrack };
}
