import { useCallback } from "react";
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
  const playTrack = useCallback(
    async (track: Track | undefined) => {
      if (!track) return;

      const streamUrl = (track as any).streamUrl;

      if (!streamUrl) {
        console.warn("[Room] track sin streamUrl válido", track);
        return;
      }

      await changeTrackFromExternalStream({
        trackId: track.id,
        streamUrl,
      });
    },
    [changeTrackFromExternalStream]
  );

  const handlePrevious = useCallback(async () => {
    if (!queue || queue.length === 0 || !currentTrack) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex <= 0) return;

    await playTrack(queue[currentIndex - 1]);
  }, [queue, currentTrack, playTrack]);

  const handleNext = useCallback(async () => {
    if (!queue || queue.length === 0) return;

    const currentIndex = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1;
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (nextIndex >= queue.length) return;

    await playTrack(queue[nextIndex]);
  }, [queue, currentTrack, playTrack]);

  const handleSelectTrack = useCallback(
    async (trackId: string) => {
      if (!queue) return;

      const selectedTrack = queue.find((t) => t.id === trackId);
      if (!selectedTrack) return;

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
