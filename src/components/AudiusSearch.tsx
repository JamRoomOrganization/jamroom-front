
'use client';

import { useState } from 'react';
import { searchAudiusTracks, getAudiusStreamUrl } from '@/lib/audiusClient';

type AudiusTrack = {
    id: string;
    title: string;
    permalink: string;
    artwork?: {
        '150x150'?: string;
        '480x480'?: string;
        '1000x1000'?: string;
    };
    user?: {
        handle: string;
        name: string;
    };
};

type Props = {
    onTrackSelected: (opts: {
        trackId: string;        // Audius track id
        streamUrl: string;      // URL que va al <audio> y sync-service
        title: string;
        artist?: string;
        artworkUrl?: string;
    }) => void;
};

export function AudiusSearch({ onTrackSelected }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AudiusTrack[]>([]);
    const [loading, setLoading] = useState(false);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            const tracks = await searchAudiusTracks(query.trim());
            setResults(tracks);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectTrack(track: AudiusTrack) {
        const streamUrl = await getAudiusStreamUrl(track.id);
        if (!streamUrl) {
            alert('No se pudo obtener el stream de Audius');
            return;
        }

        onTrackSelected({
            trackId: track.id,
            streamUrl,
            title: track.title,
            artist: track.user?.name ?? track.user?.handle,
            artworkUrl:
                track.artwork?.['480x480'] ??
                track.artwork?.['150x150'] ??
                track.artwork?.['1000x1000'],
        });
    }

    return (
        <div className="space-y-2">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                    placeholder="Buscar en Audius..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="submit"
                    className="rounded bg-indigo-500 px-3 py-1 text-sm font-semibold"
                    disabled={loading}
                >
                    {loading ? 'Buscando…' : 'Buscar'}
                </button>
            </form>

            <div className="max-h-64 overflow-y-auto space-y-1">
                {results.map((track) => (
                    <button
                        key={track.id}
                        type="button"
                        onClick={() => handleSelectTrack(track)}
                        className="flex w-full items-center gap-3 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-left hover:bg-slate-700"
                    >
                        {track.artwork?.['150x150'] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={track.artwork['150x150']}
                                alt={track.title}
                                className="h-10 w-10 rounded object-cover"
                            />
                        )}
                        <div className="flex flex-col text-xs">
                            <span className="font-semibold">{track.title}</span>
                            <span className="text-slate-300">
                {track.user?.name ?? track.user?.handle}
              </span>
                        </div>
                    </button>
                ))}
                {!loading && results.length === 0 && (
                    <p className="text-xs text-slate-400">Sin resultados.</p>
                )}
            </div>
        </div>
    );
}
