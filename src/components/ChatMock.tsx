import React from "react";
import type { ChatMessage } from "../types";
import { mockMessages } from "../mocks/data";

export default function ChatMock({ messages = mockMessages }: { messages?: ChatMessage[] }) {
  return (
    <div className="bg-slate-800 p-3 rounded h-64 overflow-auto space-y-2">
      <h4 className="font-semibold">Chat</h4>
      {messages.map(m => (
        <div key={m.id} className="text-sm">
          <strong className="text-slate-200">{m.user}</strong>
          <span className="text-slate-400 ml-2 text-xs"> {m.ts}</span>
          <div className="text-slate-100">{m.text}</div>
        </div>
      ))}
      <div className="mt-2">
        <input className="w-full p-2 rounded bg-slate-700" placeholder="Escribe un mensaje (mock)"/>
      </div>
    </div>
  );
}
