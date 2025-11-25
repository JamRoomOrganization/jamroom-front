"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  addTrack: (trackId: string, metadata?: {
    title?: string;
    artist?: string;
    artworkUrl?: string;
    duration?: number;
  }) => Promise<{ streamUrl: string }>;
  removeTrack: (trackId: string) => Promise<void>;
};

export function useRoomQueue(roomId: string): UseRoomQueueResult {
  const [queue, setQueue] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Para evitar múltiples fetches simultáneos
  const isFetchingRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      console.log("[useRoomQueue] Obteniendo cola para sala:", roomId);

      const response = await api.get<RoomQueueItem[]>(
        `/api/rooms/${roomId}/queue`,
        true
      );

      const items = response.data || [];
      console.log("[useRoomQueue] Items de cola recibidos:", items.length);

      // Obtener metadatos completos de Audius para cada track
      const tracksWithMetadata: Track[] = await Promise.all(
        items.map(async (item) => {
          try {
            // Obtener stream URL
            const streamUrl = await getAudiusStreamUrl(item.track_id);

            // Obtener metadatos completos del track de Audius
            let trackMetadata = null;
            try {
              const trackResponse = await fetch(
                `https://discoveryprovider.audius.co/v1/tracks/${item.track_id}`
              );
              if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                trackMetadata = trackData?.data?.[0] || trackData?.data;
              }
            } catch (err) {
              console.warn(`[useRoomQueue] No se pudo obtener metadata para ${item.track_id}`);
            }

            return {
              id: item.track_id,
              title: trackMetadata?.title || item.title || item.track_id,
              artist: trackMetadata?.user?.name || undefined,
              duration: trackMetadata?.duration || undefined,
              artworkUrl: trackMetadata?.artwork?.['480x480'] ||
                         trackMetadata?.artwork?.['1000x1000'] ||
                         trackMetadata?.artwork?.['150x150'] || undefined,
              cover_url: trackMetadata?.artwork?.['480x480'] ||
                        trackMetadata?.artwork?.['1000x1000'] ||
                        trackMetadata?.artwork?.['150x150'] || undefined,
              streamUrl: streamUrl || undefined,
              url: streamUrl || undefined,
            };
          } catch (err) {
            console.error(
              `[useRoomQueue] Error resolviendo stream para ${item.track_id}:`,
              err
            );
            return {
              id: item.track_id,
              title: item.title || item.track_id,
              streamUrl: undefined,
              url: undefined,
            };
          }
        })
      );

      setQueue(tracksWithMetadata);
      setError(null);
    } catch (err) {
      console.error("[useRoomQueue] error fetching queue", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar la cola"
      );
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [roomId]);

  // Fetch inicial
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Polling cada 10 segundos para sincronizar la cola (reducido para evitar recargas)
  useEffect(() => {
    // Agregar un pequeño delay aleatorio para evitar que todas las pestañas hagan polling al mismo tiempo
    const randomDelay = Math.random() * 2000; // 0-2 segundos

    const startPolling = setTimeout(() => {
      const interval = setInterval(() => {
        // Solo hacer polling si el componente está montado y no hay un fetch en progreso
        if (!isFetchingRef.current) {
          console.log("[useRoomQueue] Sincronizando cola (polling)");
          fetchQueue();
        }
      }, 10000); // 10 segundos

      return () => clearInterval(interval);
    }, randomDelay);

    return () => {
      clearTimeout(startPolling);
    };
  }, [fetchQueue]);

  const addTrack = useCallback(async (trackId: string, metadata?: {
    title?: string;
    artist?: string;
    artworkUrl?: string;
    duration?: number;
  }) => {
    try {
      console.log("[useRoomQueue] Añadiendo track:", trackId, metadata);

      // Resolver streamUrl
      const streamUrl = await getAudiusStreamUrl(trackId);

      if (!streamUrl) {
        throw new Error('No se pudo obtener la URL de streaming');
      }

      console.log("[useRoomQueue] StreamUrl obtenida:", streamUrl);

      // Enviar al backend - IMPORTANTE: enviar el trackId de Audius, NO la streamUrl
      await api.post(
        `/api/rooms/${roomId}/queue`,
        {
          trackId: trackId,  // ID de Audius (ej: "4j0qa")
          title: metadata?.title || "Nueva Canción",
        },
        true
      );

      console.log("[useRoomQueue] Track añadido exitosamente al backend");

      // Actualizar cola inmediatamente (optimistic update)
      const newTrack: Track = {
        id: trackId,
        title: metadata?.title || "Nueva Canción",
        artist: metadata?.artist,
        duration: metadata?.duration,
        artworkUrl: metadata?.artworkUrl,
        cover_url: metadata?.artworkUrl,
        streamUrl,
        url: streamUrl,
      };

      setQueue((prev) => [...prev, newTrack]);

      // Recargar cola del servidor para confirmar y obtener metadatos completos
      setTimeout(() => fetchQueue(), 1000);

      return { streamUrl };
    } catch (err) {
      console.error("[useRoomQueue] Error al añadir track:", err);
      setError(
        err instanceof Error ? err.message : "Error al añadir la canción"
      );
      throw err;
    }
  }, [roomId, fetchQueue]);

  const removeTrack = useCallback(async (trackId: string) => {
    try {
      // Optimistic update
      setQueue((prevQueue) => prevQueue.filter((t) => t.id !== trackId));

      await api.delete(`/api/rooms/${roomId}/queue/${trackId}`, true);

      console.log('[useRoomQueue] Track eliminado exitosamente');

      // Recargar para confirmar
      setTimeout(() => fetchQueue(), 500);
    } catch (err) {
      console.error('[useRoomQueue] Error al eliminar track:', err);
      setError(err instanceof Error ? err.message : "Error al eliminar la canción.");

      // Revertir optimistic update
      await fetchQueue();

      throw err;
    }
  }, [roomId, fetchQueue]);

  return {
    queue,
    loading,
    error,
    reload: fetchQueue,
    addTrack,
    removeTrack,
  };
}

