import { useCallback, useRef } from "react";
import type { Track } from "@/types";

type UseRoomPlaybackControlsArgs = {
  queue: Track[] | undefined;
  currentTrack: Track | undefined;
  changeTrackFromExternalStream: (opts: {
    trackId: string;
    streamUrl: string;
  }) => Promise<void>;
};

export function useRoomPlaybackControls({
  queue,
  currentTrack,
  changeTrackFromExternalStream,
}: UseRoomPlaybackControlsArgs) {
  // Ref para evitar cambios de pista concurrentes
  const isChangingTrackRef = useRef(false);
  // Ref para proteger contra clics rápidos (debounce)
  const lastTrackChangeRef = useRef<number>(0);
  // Throttle mínimo entre cambios de pista (ms)
  const TRACK_CHANGE_THROTTLE = 500;

  const playTrack = useCallback(
    async (track: Track | undefined) => {
      if (!track) {
        console.warn("[useRoomPlaybackControls] playTrack: track undefined");
        return;
      }

      const now = Date.now();
      
      // Protección contra clics rápidos
      if (now - lastTrackChangeRef.current < TRACK_CHANGE_THROTTLE) {
        console.log("[useRoomPlaybackControls] playTrack: throttled (clic muy rápido)");
        return;
      }

      // Protección contra cambios concurrentes
      if (isChangingTrackRef.current) {
        console.log("[useRoomPlaybackControls] playTrack: cambio en progreso, ignorando");
        return;
      }

      const streamUrl = (track as any).streamUrl;

      if (!streamUrl) {
        console.warn("[useRoomPlaybackControls] track sin streamUrl válido", track.id);
        return;
      }

      isChangingTrackRef.current = true;
      lastTrackChangeRef.current = now;

      console.log("[useRoomPlaybackControls] playTrack: cambiando a", track.id);

      try {
        await changeTrackFromExternalStream({
          trackId: track.id,
          streamUrl,
        });
      } catch (err) {
        console.error("[useRoomPlaybackControls] Error cambiando track:", err);
      } finally {
        // Pequeño delay antes de permitir otro cambio para asegurar sincronización
        setTimeout(() => {
          isChangingTrackRef.current = false;
        }, 300);
      }
    },
    [changeTrackFromExternalStream]
  );

  const handlePrevious = useCallback(async () => {
    if (!queue || queue.length === 0) {
      console.warn("[useRoomPlaybackControls] handlePrevious: cola vacía");
      return;
    }

    // Usar currentTrack.id si está disponible, sino buscar el primer track
    const currentId = currentTrack?.id;
    if (!currentId) {
      console.warn("[useRoomPlaybackControls] handlePrevious: no hay track actual");
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentId);
    
    if (currentIndex <= 0) {
      console.log("[useRoomPlaybackControls] handlePrevious: ya estamos en el primer track");
      return;
    }

    const previousTrack = queue[currentIndex - 1];
    console.log("[useRoomPlaybackControls] handlePrevious:", {
      from: currentId,
      fromIndex: currentIndex,
      to: previousTrack?.id,
      toIndex: currentIndex - 1,
    });

    await playTrack(previousTrack);
  }, [queue, currentTrack, playTrack]);

  const handleNext = useCallback(async () => {
    if (!queue || queue.length === 0) {
      console.warn("[useRoomPlaybackControls] handleNext: cola vacía");
      return;
    }

    // Calcular índice actual
    const currentId = currentTrack?.id;
    const currentIndex = currentId
      ? queue.findIndex((t) => t.id === currentId)
      : -1;
    
    // Si no hay track actual o no se encuentra, empezar desde el primero
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (nextIndex >= queue.length) {
      console.log("[useRoomPlaybackControls] handleNext: ya estamos en el último track");
      return;
    }

    const nextTrack = queue[nextIndex];
    console.log("[useRoomPlaybackControls] handleNext:", {
      from: currentId,
      fromIndex: currentIndex,
      to: nextTrack?.id,
      toIndex: nextIndex,
    });

    await playTrack(nextTrack);
  }, [queue, currentTrack, playTrack]);

  const handleSelectTrack = useCallback(
    async (trackId: string) => {
      if (!queue) {
        console.warn("[useRoomPlaybackControls] handleSelectTrack: cola undefined");
        return;
      }

      const selectedTrack = queue.find((t) => t.id === trackId);
      if (!selectedTrack) {
        console.warn("[useRoomPlaybackControls] handleSelectTrack: track no encontrado", trackId);
        return;
      }

      console.log("[useRoomPlaybackControls] handleSelectTrack:", trackId);
      await playTrack(selectedTrack);
    },
    [queue, playTrack]
  );

  return {
    handlePrevious,
    handleNext,
    handleSelectTrack,
  };
}
