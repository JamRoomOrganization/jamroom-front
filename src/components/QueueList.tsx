import React from "react";
import type { Track } from "../types";

export default function QueueList({ queue = [] }: { queue?: Track[] }) {
  return (
    <div className="bg-slate-800 p-3 rounded space-y-2">
      <h4 className="font-semibold">Cola</h4>
      {queue.map((t, i) => (
        <div key={t.id} className="flex items-center justify-between">
          <div>
            <div className="text-sm">{t.title}</div>
            <div className="text-xs text-slate-400">{t.artist}</div>
          </div>
          <div className="text-xs text-slate-400">{Math.floor(t.duration/60)}:{String(t.duration%60).padStart(2,'0')}</div>
        </div>
      ))}
    </div>
  );
}
