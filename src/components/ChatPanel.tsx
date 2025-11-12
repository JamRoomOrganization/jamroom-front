import React from "react";
import { mockMessages } from "../mocks/data";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  ts: string;
};

export default function ChatPanel({ messages = mockMessages }: { messages?: ChatMessage[] }) {
  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    // TODO: integra tu socket/chat
    setDraft("");
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 h-[420px] flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h4 className="text-white font-semibold">Chat</h4>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <strong className="text-slate-200">{m.user}</strong>
              <span className="text-slate-400 text-xs">{m.ts}</span>
            </div>
            <div className="text-slate-100">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && send()}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-700/70 text-slate-100 placeholder:text-slate-400 outline-none"
            placeholder="Escribe un mensaje…"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 disabled:opacity-50 text-white"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
