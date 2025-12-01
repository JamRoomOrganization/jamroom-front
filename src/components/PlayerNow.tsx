import React from "react";
import {
    Pause,
    Play,
    Plus,
    SkipBack,
    SkipForward,
    Volume1,
    Volume2,
    VolumeX,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

type Track = {
    id: string;
    title: string;
    artist?: string;
    duration?: number;
    cover_url?: string;
    artworkUrl?: string;
    streamUrl?: string;
    url?: string;
};

type PlayerNowProps = {
    track?: Track;
    onAddClick?: () => void;
    onSkipClick?: () => void;
    onPreviousClick?: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    isPlaying?: boolean;
    onPlayPause?: (nextIsPlaying: boolean) => void;
    onSeek?: (positionSeconds: number) => void;
    hasUserInteracted?: boolean;
    forcePlay?: () => Promise<boolean>;
    canControlPlayback?: boolean;
};

const DEFAULT_DURATION = 240;

function fmt(sec = 0) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
}

const PlayerNow = React.memo(function PlayerNow({
                                                    track,
                                                    onAddClick,
                                                    onSkipClick,
                                                    onPreviousClick,
                                                    audioRef,
                                                    isPlaying: isPlayingProp,
                                                    onPlayPause,
                                                    onSeek,
                                                    hasUserInteracted,
                                                    forcePlay,
                                                    canControlPlayback = true,
                                                }: PlayerNowProps) {
    const [pos, setPos] = React.useState(0);
    const [total, setTotal] = React.useState(track?.duration ?? DEFAULT_DURATION);
    const [volume, setVolume] = React.useState(1);
    const [isMuted, setIsMuted] = React.useState(false);

    const isPlaying = isPlayingProp ?? false;

    // Throttle de actualizaciones de posición para reducir renders
    const rafIdRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    // Reset de posición y duración cuando cambia de pista
    React.useEffect(() => {
        setPos(0);
        setTotal(track?.duration ?? DEFAULT_DURATION);
    }, [track?.id, track?.duration]);

    const pct = Math.min(100, (pos / Math.max(total, 1)) * 100);
    const controlsDisabled = !canControlPlayback || !track;

    // Handlers de audio (usados directamente en el <audio>)
    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        if (rafIdRef.current !== null) {
            return;
        }
        rafIdRef.current = window.requestAnimationFrame(() => {
            setPos(audio.currentTime);
            rafIdRef.current = null;
        });
    };

    const handleDurationChange = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        const newDuration = Number.isFinite(audio.duration)
            ? audio.duration
            : DEFAULT_DURATION;
        setTotal(newDuration);
    };

    const handleVolumeChange = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        setVolume(audio.volume);
        setIsMuted(audio.volume === 0);
    };

    const handleEnded = () => {
        console.log("[PlayerNow] Canción terminada, saltando a siguiente");
        onSkipClick?.();
    };

    const handleStalled = async (e: React.SyntheticEvent<HTMLAudioElement>) => {
        console.warn("[PlayerNow] Audio detenido (stalled), intentando reanudar");

        if (!isPlaying) return;

        // Si el hook expone forcePlay, dejamos que él decida cómo reanudar
        if (forcePlay) {
            try {
                const ok = await forcePlay();
                if (!ok) {
                    console.warn("[PlayerNow] forcePlay no pudo reanudar tras stalled");
                }
            } catch (err) {
                console.error(
                    "[PlayerNow] Error al ejecutar forcePlay tras stalled:",
                    err
                );
            }
            return;
        }

        // Fallback ultra simple si algún día usas PlayerNow sin hook
        const audio = e.currentTarget;
        if (audio.paused || !audio.src) return;
        try {
            await audio.play();
        } catch (err) {
            console.error("[PlayerNow] Error al reanudar tras stalled (fallback):", err);
        }
    };


    const handleWaiting = () => {
        console.log("[PlayerNow] Audio buffering...");
    };

    // Play / pause – bloqueado si no tiene permiso
    const togglePlayPause = () => {
        if (!canControlPlayback) {
            console.warn("[PlayerNow] Usuario sin permiso de control de reproducción");
            return;
        }

        if (!track) {
            console.warn("[PlayerNow] ⚠ No hay pista seleccionada");
            return;
        }

        if (onPlayPause) {
            const nextState = !isPlaying;
            console.log(
                "[PlayerNow] 🎵 Cambiando estado a:",
                nextState ? "playing" : "paused"
            );
            onPlayPause(nextState);
        }
    };

    const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newVolume = parseFloat(e.target.value);
        audio.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isMuted) {
            const nextVolume = volume > 0 ? volume : 0.5;
            audio.volume = nextVolume;
            setIsMuted(false);
        } else {
            audio.volume = 0;
            setIsMuted(true);
        }
    };

    const skipTime = (seconds: number) => {
        if (!canControlPlayback) {
            console.warn(
                "[PlayerNow] Usuario sin permiso para adelantar/retroceder"
            );
            return;
        }

        const audio = audioRef.current;
        if (!audio) return;

        const next = Math.max(0, Math.min(total, audio.currentTime + seconds));

        if (onSeek) {
            // onSeek trabaja en segundos
            onSeek(next);
        } else {
            audio.currentTime = next;
        }
    };

    // Seek – solo si tiene permiso
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canControlPlayback) {
            console.warn("[PlayerNow] Usuario sin permiso para hacer seek");
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const targetSeconds = (x / rect.width) * total;

        if (onSeek) {
            onSeek(targetSeconds);
        } else {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = targetSeconds;
        }
    };

    const playPauseTitle = !canControlPlayback
        ? "No tienes permiso para controlar la reproducción"
        : isPlaying
            ? "Pausar"
            : "Reproducir";

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
            {/* Audio oculto */}
            <audio
                ref={audioRef}
                className="hidden"
                crossOrigin="anonymous"
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onVolumeChange={handleVolumeChange}
                onEnded={handleEnded}
                onStalled={handleStalled}
                onWaiting={handleWaiting}
                onError={(e) => {
                    console.error("[PlayerNow] Error al cargar audio:", e);
                    const target = e.target as HTMLAudioElement;
                    if (target.error) {
                        console.error("[PlayerNow] Error code:", target.error.code);
                        console.error("[PlayerNow] Error message:", target.error.message);
                        console.error("[PlayerNow] URL actual:", target.src);
                    }
                }}
                onLoadedData={() => {
                    console.log("[PlayerNow] Audio cargado correctamente");
                }}
                onCanPlay={() => {
                    console.log("[PlayerNow] Audio listo para reproducir");
                }}
                onLoadStart={() => {
                    console.log("[PlayerNow] Iniciando carga de audio");
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                    Reproduciendo ahora
                </h3>
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-300">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            en vivo
          </span>
                </div>
            </div>

            {/* Banner de interacción obligatoria */}
            {isPlaying && !hasUserInteracted && (
                <div
                    className="mb-4 p-4 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 border-2 border-yellow-400 rounded-xl text-white cursor-pointer hover:from-yellow-500/50 hover:to-orange-500/50 transition-all animate-pulse shadow-lg shadow-yellow-500/30"
                    onClick={async () => {
                        console.log(
                            "[PlayerNow] Banner clickeado - intento de reproducción inmediata"
                        );

                        const audio = audioRef.current;
                        if (!audio) {
                            console.warn("[PlayerNow] No hay ref de audio");
                            return;
                        }

                        // Si tenemos forcePlay, delegamos toda la lógica al hook.
                        if (forcePlay) {
                            try {
                                const ok = await forcePlay();
                                if (!ok) {
                                    console.warn(
                                        "[PlayerNow] forcePlay no pudo iniciar la reproducción"
                                    );
                                }
                            } catch (err) {
                                console.error(
                                    "[PlayerNow] Error al ejecutar forcePlay desde el banner:",
                                    err
                                );
                            }
                            return;
                        }

                        // Fallback: reproducir directo si no hay forcePlay (no debería ser el caso normal).
                        try {
                            await audio.play();
                            console.log(
                                "[PlayerNow] ✓ Reproducción iniciada directamente desde el banner"
                            );
                        } catch (err) {
                            console.error("[PlayerNow] Error al reproducir:", err);
                        }
                    }}
                >
                    <p className="flex items-center gap-3 text-sm sm:text-base font-bold">
                        <svg
                            className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 animate-bounce"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                        </svg>
                        <span>🎵 Haz clic aquí para activar el audio</span>
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-yellow-100 ml-7 sm:ml-10 font-medium">
                        Hay música reproduciéndose. El navegador necesita tu interacción
                        para que empiece a sonar.
                    </p>
                </div>
            )}

            {/* Info de la pista */}
            <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-700/60">
                    {track?.cover_url || track?.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={track.cover_url || track.artworkUrl}
                            alt={track.title || "Album art"}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                className="text-white"
                            >
                                <path
                                    fill="currentColor"
                                    d="M8 5v10.55a4 4 0 1 0 2 3.45V8h6V5z"
                                />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-lg sm:text-2xl font-bold text-white truncate">
                        {track?.title ?? "Selecciona una canción"}
                    </h4>
                    {track?.artist && (
                        <p className="text-slate-400 mt-1 text-sm">{track.artist}</p>
                    )}
                </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-4">
                <div
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={pos}
                    onClick={handleSeek}
                    className={`relative w-full h-3 rounded-full bg-slate-700 cursor-pointer transition-all group ${
                        !canControlPlayback ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all relative"
                        style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="absolute inset-0 rounded-full ring-2 ring-purple-400/30" />
                    </div>
                </div>
                <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 mt-2">
                    <span>{fmt(pos)}</span>
                    <span>{fmt(total)}</span>
                </div>
            </div>

            {/* Controles principales */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Navegación */}
                <div className="flex items-center gap-2">
                    {onPreviousClick && (
                        <button
                            onClick={onPreviousClick}
                            disabled={!canControlPlayback}
                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                                canControlPlayback
                                    ? "Canción anterior"
                                    : "No tienes permiso para controlar la reproducción"
                            }
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    <button
                        onClick={() => skipTime(-10)}
                        disabled={!canControlPlayback}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                            canControlPlayback
                                ? "Retroceder 10s"
                                : "No tienes permiso para controlar la reproducción"
                        }
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={togglePlayPause}
                        disabled={controlsDisabled}
                        className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white transition-all shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                        title={playPauseTitle}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    <button
                        onClick={() => skipTime(10)}
                        disabled={!canControlPlayback}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                            canControlPlayback
                                ? "Avanzar 10s"
                                : "No tienes permiso para controlar la reproducción"
                        }
                    >
                        <SkipForward size={20} />
                    </button>

                    {onSkipClick && (
                        <button
                            onClick={onSkipClick}
                            disabled={!canControlPlayback}
                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                                canControlPlayback
                                    ? "Siguiente canción"
                                    : "No tienes permiso para controlar la reproducción"
                            }
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>

                {/* Volumen + Añadir */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleMute}
                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                            title={isMuted ? "Activar sonido" : "Silenciar"}
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX size={20} />
                            ) : volume < 0.5 ? (
                                <Volume1 size={20} />
                            ) : (
                                <Volume2 size={20} />
                            )}
                        </button>

                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeSliderChange}
                            className="w-24 h-2 rounded-lg appearance-none bg-slate-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                            title="Volumen"
                        />
                    </div>

                    {onAddClick && (
                        <button
                            onClick={onAddClick}
                            className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors border border-purple-500/30"
                            title="Añadir a la cola"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

export default PlayerNow;
