// src/components/AddSongDialog.tsx
"use client";

import React from "react";
import { AudiusTrack, searchAudiusTracks, getAudiusStreamUrl } from "@/lib/audiusClient";

type AddSongDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomId: string;
    onChangeExternalTrack?: (opts: {
        streamUrl: string;
        title: string;
        artist?: string;
        artworkUrl?: string;
        source?: "audius" | "other";
    }) => void;
};

export default function AddSongDialog({
                                          open,
                                          onOpenChange,
                                          roomId, // Reservado para futura integración con backend
                                          onChangeExternalTrack,
                                      }: AddSongDialogProps) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<AudiusTrack[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Busca en Audius cuando envías el formulario
    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        try {
            const tracks = await searchAudiusTracks(trimmed);
            setResults(tracks);
            if (tracks.length === 0) {
                setError("No se encontraron resultados en Audius.");
            }
        } catch (err: unknown) {
            console.error("[AddSongDialog] Audius search error", err);
            setError("Error al buscar en Audius.");
        } finally {
            setLoading(false);
        }
    }

    // Cuando el usuario selecciona un track de la lista
    async function handleSelectTrack(track: AudiusTrack) {
        try {
            const streamUrl = await getAudiusStreamUrl(track.id);
            if (!streamUrl) {
                setError("No se pudo obtener el stream de este track.");
                return;
            }

            onChangeExternalTrack?.({
                streamUrl,
                title: track.title,
                artist: track.user?.name ?? track.user?.handle ?? "Audius",
                artworkUrl:
                    track.artwork?.["480x480"] ??
                    track.artwork?.["1000x1000"] ??
                    track.artwork?.["150x150"],
                source: "audius",
            });

            // Opcional: cerrar el diálogo después de seleccionar
            onOpenChange(false);
        } catch (err: unknown) {
            console.error("[AddSongDialog] handleSelectTrack error", err);
            setError("Error al preparar la reproducción de este track.");
        }
    }

    // Si no está abierto, ni lo pintes
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                        Añadir canción desde Audius
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-slate-200 text-sm"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Formulario de búsqueda */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por título o artista…"
                        className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? "Buscando…" : "Buscar"}
                    </button>
                </form>

                {error && (
                    <p className="text-xs text-red-400 mb-3">
                        {error}
                    </p>
                )}

                {/* Lista de resultados */}
                <div className="max-h-72 overflow-y-auto space-y-2">
                    {results.map((track) => (
                        <button
                            key={track.id}
                            type="button"
                            onClick={() => handleSelectTrack(track)}
                            className="w-full flex items-center gap-3 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 px-3 py-2 text-left transition"
                        >
                            {/* Artwork */}
                            <div className="w-10 h-10 rounded-md bg-slate-700 overflow-hidden flex-shrink-0">
                                {track.artwork?.["150x150"] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={track.artwork["150x150"]}
                                        alt={track.title}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-100 truncate">
                                    {track.title}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {track.user?.name ?? track.user?.handle ?? "Audius"}
                                </p>
                            </div>
                        </button>
                    ))}

                    {!loading && !results.length && !error && (
                        <p className="text-xs text-slate-500">
                            Escribe algo y pulsa &quot;Buscar&quot; para ver resultados desde Audius.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
