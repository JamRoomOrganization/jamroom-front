import React from "react";

type AddSongDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
  onAddSong: (trackId: string, title?: string) => Promise<void>;
};

export default function AddSongDialog({
  open,
  onOpenChange,
  roomId,
  onAddSong,  
}: AddSongDialogProps) {
  const [trackId, setTrackId] = React.useState<string>("");

  if (!open) return null;

  const submit = async () => {
    if (trackId.trim()) {
      try {
        await onAddSong(trackId, "Nueva canción"); 
        setTrackId(""); 
        onOpenChange(false); 
      } catch (err) {
        console.error("Error al añadir canción:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <h3 className="text-white text-xl font-semibold mb-2">Añadir canción</h3>
          <p className="text-slate-400 text-sm mb-4">
            Para la demo, pega un <span className="text-slate-300 font-mono">trackId</span>.
          </p>

          <input
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="p. ej. a1b2c3"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700"
          />

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!trackId.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

