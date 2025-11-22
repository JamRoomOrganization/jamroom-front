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
    onAddSong?: (trackId: string, metadata?: {
        title?: string;
        artist?: string;
        artworkUrl?: string;
        duration?: number;
    }) => Promise<void>;
};

export default function AddSongDialog({
    open,
    onOpenChange,
    roomId,
    onChangeExternalTrack,
    onAddSong,
}: AddSongDialogProps) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<AudiusTrack[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [trackIdInput, setTrackIdInput] = React.useState("");
    const [activeTab, setActiveTab] = React.useState<"search" | "manual">("search");

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
            setError(null);

            // Si tenemos onAddSong, usarlo para añadir a la cola
            if (onAddSong) {
                const artworkUrl = track.artwork?.["480x480"] ??
                                  track.artwork?.["1000x1000"] ??
                                  track.artwork?.["150x150"];

                await onAddSong(track.id, {
                    title: track.title,
                    artist: track.user?.name ?? track.user?.handle ?? "Audius",
                    artworkUrl: artworkUrl,
                    duration: track.duration
                });
                onOpenChange(false);
                return;
            }

            // Si tenemos onChangeExternalTrack, usarlo para cambiar track actual
            if (onChangeExternalTrack) {
                console.log('[AddSongDialog] Obteniendo stream URL para track:', track.id);

                const streamUrl = await getAudiusStreamUrl(track.id);

                if (!streamUrl) {
                    setError("No se pudo obtener el stream de este track. Intenta con otro.");
                    return;
                }

                console.log('[AddSongDialog] Stream URL obtenida:', streamUrl);

                onChangeExternalTrack({
                    streamUrl,
                    title: track.title,
                    artist: track.user?.name ?? track.user?.handle ?? "Audius",
                    artworkUrl:
                        track.artwork?.["480x480"] ??
                        track.artwork?.["1000x1000"] ??
                        track.artwork?.["150x150"],
                    source: "audius",
                });

                // Cerrar el diálogo después de seleccionar
                onOpenChange(false);
            }
        } catch (err: unknown) {
            console.error("[AddSongDialog] handleSelectTrack error", err);
            setError("Error al preparar la reproducción de este track. Por favor, intenta con otro.");
        }
    }

    // Manejar añadir por track ID manualmente
    const handleManualAdd = async () => {
        if (trackIdInput.trim() && onAddSong) {
            try {
                await onAddSong(trackIdInput, "Canción añadida");
                setTrackIdInput("");
                onOpenChange(false);
            } catch (err) {
                console.error("Error al añadir canción:", err);
                setError("Error al añadir canción.");
            }
        }
    };

    // Si no está abierto, no renderizar
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                        Añadir canción
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-slate-200 text-sm"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Tabs para elegir método */}
                <div className="flex border-b border-slate-700 mb-4">
                    <button
                        className={`flex-1 py-2 text-sm font-medium ${
                            activeTab === "search" 
                                ? "text-purple-400 border-b-2 border-purple-400" 
                                : "text-slate-400"
                        }`}
                        onClick={() => setActiveTab("search")}
                    >
                        Buscar en Audius
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-medium ${
                            activeTab === "manual" 
                                ? "text-purple-400 border-b-2 border-purple-400" 
                                : "text-slate-400"
                        }`}
                        onClick={() => setActiveTab("manual")}
                    >
                        Añadir por ID
                    </button>
                </div>

                {activeTab === "search" ? (
                    <>
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
                                    Escribe algo y pulsa "Buscar" para ver resultados desde Audius.
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Formulario manual por ID */}
                        <p className="text-slate-400 text-sm mb-4">
                            Para la demo, pega un <span className="text-slate-300 font-mono">trackId</span>.
                        </p>

                        <input
                            value={trackIdInput}
                            onChange={(e) => setTrackIdInput(e.target.value)}
                            placeholder="p. ej. a1b2c3"
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 mb-4"
                        />

                        {error && (
                            <p className="text-xs text-red-400 mb-3">
                                {error}
                            </p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualAdd}
                                disabled={!trackIdInput.trim()}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white disabled:opacity-50"
                            >
                                Añadir
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
