import React from "react";

export default function InviteDialog({
  open,
  onOpenChange,
  roomId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
}) {
  if (!open) return null;

  const url = typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <h3 className="text-white text-xl font-semibold mb-2">Invitar amigos</h3>
          <p className="text-slate-400 text-sm mb-4">Comparte el enlace de la sala:</p>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700"
            />
            <button onClick={copy} className="px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600">
              Copiar
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
