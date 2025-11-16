import React from "react";

type Participant = { id: string; name: string; role?: string };

function initials(name?: string) {
  const safe = (name ?? "").trim() || "Usuario";
  const parts = safe.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const result = (first + second).toUpperCase();
  return result || "U";
}

export default function ParticipantsList({ participants = [] }: { participants?: Participant[] }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h4 className="text-white font-semibold mb-3">Participantes</h4>
      {participants.length === 0 ? (
        <div className="text-slate-400 text-sm">Aún no hay participantes.</div>
      ) : (
        <ul className="space-y-3">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-xs text-white border border-slate-700/50">
                  {initials(p.name ?? p.id)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 truncate">{p.name}</div>
                  {!!p.role && (
                    <div className="text-xs text-slate-400 truncate">{p.role}</div>
                  )}
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
