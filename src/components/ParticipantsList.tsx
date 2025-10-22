import React from "react";
import type { Participant } from "../types";

export default function ParticipantsList({ participants = [] }: { participants?: Participant[] }) {
  return (
    <div className="bg-slate-800 p-3 rounded">
      <h4 className="font-semibold">Participantes</h4>
      <ul className="mt-2 space-y-2">
        {participants.map(p => (
          <li key={p.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm">{p.name}</div>
              <div className="text-xs text-slate-400">{p.role}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400"/>
          </li>
        ))}
      </ul>
    </div>
  );
}
