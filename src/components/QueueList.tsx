import React from "react";

type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number; // segundos
};

function fmt(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

export default function QueueList({
  queue = [],
  onAddClick,
  onSkipClick,
}: {
  queue?: Track[];
  onAddClick?: () => void;
  onSkipClick?: () => void;
}) {
  const next = queue.slice(1);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Cola</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddClick}
            className="px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-white text-sm transition"
          >
            Añadir
          </button>
          <button
            onClick={onSkipClick}
            className="px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-white text-sm transition disabled:opacity-50"
            disabled={next.length === 0}
          >
            Saltar
          </button>
        </div>
      </div>

      {next.length === 0 ? (
        <div className="text-slate-400 text-sm">
          No hay más canciones en la cola. ¡Añade una para continuar!
        </div>
      ) : (
        <ul className="divide-y divide-slate-700/50">
          {next.map((t, i) => (
            <li key={t.id} className="py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-slate-100 text-sm truncate">{i + 1}. {t.title}</div>
                {!!t.artist && (
                  <div className="text-slate-400 text-xs truncate">{t.artist}</div>
                )}
              </div>
              <div className="text-slate-400 text-xs">{fmt(t.duration ?? 0)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
