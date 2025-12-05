import React from "react";
import type { Visibility } from "@/app/create/page";
import { RoomVisibilitySelector } from "./RoomVisibilitySelector";

export type CreateRoomFormValues = {
  name: string;
  description: string;
  visibility: Visibility;
  initialTrackId: string;
};

type CreateRoomFormProps = {
  submitting: boolean;
  error: string | null;
  onSubmit: (values: CreateRoomFormValues) => Promise<void> | void;
};

export const CreateRoomForm: React.FC<CreateRoomFormProps> = ({
  submitting,
  error,
  onSubmit,
}) => {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<Visibility>("public");
  const [initialTrackId, setInitialTrackId] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setLocalError("El nombre de la sala es obligatorio.");
      return;
    }

    setLocalError(null);

    await onSubmit({
      name,
      description,
      visibility,
      initialTrackId,
    });
  };

  const displayError = localError || error;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1.5">
          Nombre de la sala <span className="text-red-400">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          placeholder="p. ej. Jam del viernes, Estudio Lo-Fi, etc."
          maxLength={80}
        />
        <p className="mt-1 text-xs text-slate-500">
          Este será el título que verán los participantes.
        </p>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1.5">
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
          placeholder="Cuéntales a los demás de qué va esta sesión…"
          maxLength={240}
        />
        <p className="mt-1 text-xs text-slate-500">
          Ideal para indicar género, mood o reglas de la sala.
        </p>
      </div>

      {/* Visibilidad */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1.5">
          Privacidad
        </label>
        <RoomVisibilitySelector
          value={visibility}
          onChange={setVisibility}
        />
      </div>

      {/* Canción inicial (trackId) */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1.5">
          Canción inicial (trackId opcional)
        </label>
        <input
          value={initialTrackId}
          onChange={(e) => setInitialTrackId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          placeholder="Pega aquí el trackId de Audius (p. ej. 123456789)"
        />
      </div>

      {/* Error */}
      {displayError && (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {displayError}
        </div>
      )}

      {/* Botón de acción */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02]"
        >
          {submitting && (
            <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          )}
          <span>{submitting ? "Creando sala…" : "Crear sala"}</span>
        </button>
      </div>
    </form>
  );
};
