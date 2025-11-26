import React from "react";
import { Play } from "lucide-react";

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

function fmt(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

const QueueList = React.memo(function QueueList({
  queue = [],
  currentTrack,
  onAddClick,
  onSelectTrack,
}: {
  queue?: Track[];
  currentTrack?: Track;
  onAddClick?: () => void;
  onSelectTrack?: (trackId: string) => void;
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Cola de Reproducción</h3>
        <button
          onClick={onAddClick}
          className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm transition border border-purple-500/30"
        >
          + Añadir
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-8">
          🎵 No hay canciones en la cola
          <p className="mt-2 text-xs">¡Añade una para empezar!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((track, index) => (
              <div
                  key={`${track.id}-${index}`}   // 👈 ANTES: key={track.id}
                  onClick={() => onSelectTrack?.(track.id)}
                  className={`
      p-3 rounded-lg cursor-pointer transition-all
      ${currentTrack?.id === track.id
                      ? 'bg-purple-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-slate-700/50 hover:border-slate-600/50'
                  }
    `}
              >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium w-6 ${
                  currentTrack?.id === track.id ? 'text-purple-400' : 'text-slate-400'
                }`}>
                  {index + 1}
                </span>

                {(track.artworkUrl || track.cover_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.artworkUrl || track.cover_url}
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${
                    currentTrack?.id === track.id ? 'text-white' : 'text-slate-200'
                  }`}>
                    {track.title}
                  </p>
                  {track.artist && (
                    <p className="text-slate-400 text-sm truncate">{track.artist}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {track.duration && (
                    <span className="text-slate-400 text-xs">{fmt(track.duration)}</span>
                  )}
                  {currentTrack?.id === track.id && (
                    <div className="text-purple-400 animate-pulse">
                      <Play size={16} fill="currentColor" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default QueueList;
