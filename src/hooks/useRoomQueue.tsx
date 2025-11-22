"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getAudiusStreamUrl } from "@/lib/audiusClient";

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
  artworkUrl?: string;
  streamUrl?: string;
  url?: string;
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

  const addTrack = async (trackId: string, metadata?: {
    title?: string;
    artist?: string;
    artworkUrl?: string;
    duration?: number;
  }) => {
    try {
      console.log('[useRoomQueue] Añadiendo track:', trackId, metadata);

      // Obtener la URL de streaming real de Audius
      const streamUrl = await getAudiusStreamUrl(trackId);

      if (!streamUrl) {
        console.error('[useRoomQueue] No se pudo obtener URL de stream para:', trackId);
        throw new Error('No se pudo obtener la URL de streaming');
      }

      console.log('[useRoomQueue] URL de stream obtenida:', streamUrl);

      const newTrack: Track = {
        id: trackId,           // Mantener el ID original de Audius
        title: metadata?.title || "Nueva Canción",
        artist: metadata?.artist || "",
        duration: metadata?.duration || 240,
        cover_url: metadata?.artworkUrl || "",
        artworkUrl: metadata?.artworkUrl || "",
        streamUrl: streamUrl,  // URL de streaming real
        url: streamUrl,        // También en url por compatibilidad
      };

      setQueue((prevQueue) => [...prevQueue, newTrack]);

      // Enviar al backend
      await api.post(`/api/rooms/${roomId}/queue`, {
        trackId: streamUrl,
        title: metadata?.title || "Nueva Canción"
      }, true);

      console.log('[useRoomQueue] Track añadido exitosamente a la cola');
    } catch (err: unknown) {
      console.error('[useRoomQueue] Error al agregar track:', err);
      setError(err instanceof Error ? err.message : "Error al agregar la canción.");
      throw err;
    }
  };

  const skipTrack = async () => {
    try {
      const newQueue = queue.slice(1); 
      setQueue(newQueue);

      await api.post(`/api/rooms/${roomId}/queue/skip`, {}, true);
    } catch (err: unknown) {
      console.error('[useRoomQueue] Error al saltar track:', err);
      setError(err instanceof Error ? err.message : "Error al saltar la canción.");
    }
  };

  return { queue, loading, error, addTrack, skipTrack };
}
