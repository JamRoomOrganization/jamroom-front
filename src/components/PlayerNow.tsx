import React from "react";

type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number; 
  cover_url?: string;
};

function fmt(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

export default function PlayerNow({
  track,
  onAddClick,
  onSkipClick,
}: {
  track?: Track;
  onAddClick?: () => void;
  onSkipClick?: () => void;
}) {
  const [pos, setPos] = React.useState(0);
  const total = track?.duration ?? 240;

  React.useEffect(() => {
    setPos(0);
  }, [track?.id]);

  React.useEffect(() => {
    const i = setInterval(() => setPos((p) => Math.min(p + 1, total)), 1000);
    return () => clearInterval(i);
  }, [total]);

  const pct = Math.min(100, (pos / Math.max(total, 1)) * 100);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-white">Reproduciendo ahora</h3>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            en vivo
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-700/60">
          {track?.cover_url ? (
            <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="M8 5v10.55a4 4 0 1 0 2 3.45V8h6V5z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-2xl font-bold text-white truncate">
              {track?.title ?? "Selecciona una canción"}
            </h4>
          </div>
          {track?.artist && (
            <p className="text-slate-400">{track.artist}</p>
          )}

          <div className="mt-5">
            <div
              role="slider"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={pos}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = (e as any).clientX - rect.left;
                const next = Math.round((x / rect.width) * total);
                setPos(next);
              }}
              className="w-full h-2 rounded-full bg-slate-700 cursor-pointer"
            >
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-slate-400 text-sm mt-2">
              <span>{fmt(pos)}</span>
              <span>{fmt(total)}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-white transition"
              onClick={onAddClick}
            >
              Añadir canción
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transition"
              onClick={onSkipClick}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

