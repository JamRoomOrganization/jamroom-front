import React from "react";
import { Pause, Play, Plus, SkipBack, SkipForward, Volume1, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

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
  onChangeExternalTrack?: (opts: {
    streamUrl: string;
    title?: string;
    artist?: string;
    artworkUrl?: string;
    source?: "audius" | "other";
  }) => void;
};

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
  onChangeExternalTrack,
}: PlayerNowProps) {
  const [pos, setPos] = React.useState(0);
  const [total, setTotal] = React.useState(track?.duration ?? 240);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  // Sincronizar con eventos del audio
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setPos(audio.currentTime);
    const handleDurationChange = () => setTotal(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setVolume(audio.volume);
    const handleEnded = () => {
      console.log('[PlayerNow] Canción terminada, saltando a siguiente');
      onSkipClick?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, onSkipClick]);

  // Cargar nueva pista
  React.useEffect(() => {
    const audio = audioRef.current;
    const streamUrl = track?.streamUrl || track?.url;

    if (!audio || !streamUrl) return;

    console.log('[PlayerNow] Cargando nueva pista:', streamUrl);

    audio.src = streamUrl;
    audio.load();

    audio.play().catch(error => {
      console.error('[PlayerNow] Error al intentar reproducir:', error);
    });

    setPos(0);
  }, [track?.id, track?.streamUrl, track?.url, audioRef]);

  const pct = Math.min(100, (pos / Math.max(total, 1)) * 100);

  // Control de reproducción/pausa
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => {
        console.error('[PlayerNow] Error al reproducir:', error);
      });
    }
  };

  // Control de volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Silenciar/Activar sonido
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  // Saltar 10 segundos
  const skipTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(total, audio.currentTime + seconds));
  };

  // Buscar en la pista
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    audio.currentTime = (x / rect.width) * total;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      {/* Audio oculto - solo para funcionalidad */}
      <audio
        ref={audioRef}
        className="hidden"
        crossOrigin="anonymous"
        preload="metadata"
        onError={(e) => {
          console.error('[PlayerNow] Error al cargar audio:', e);
          const target = e.target as HTMLAudioElement;
          if (target.error) {
            console.error('[PlayerNow] Código de error:', target.error.code);
            console.error('[PlayerNow] Mensaje:', target.error.message);
            console.error('[PlayerNow] URL actual:', target.src);
          }
        }}
        onLoadedData={() => {
          console.log('[PlayerNow] Audio cargado correctamente');
        }}
        onCanPlay={() => {
          console.log('[PlayerNow] Audio listo para reproducir');
        }}
        onLoadStart={() => {
          console.log('[PlayerNow] Iniciando carga de audio');
        }}
      />

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-white">Reproduciendo ahora</h3>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            en vivo
          </span>
        </div>
      </div>

      {/* Información de la pista */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-700/60">
          {(track?.cover_url || track?.artworkUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.cover_url || track.artworkUrl} alt={track.title || 'Album art'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="M8 5v10.55a4 4 0 1 0 2 3.45V8h6V5z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-2xl font-bold text-white truncate">
            {track?.title ?? "Selecciona una canción"}
          </h4>
          {track?.artist && (
            <p className="text-slate-400 mt-1">{track.artist}</p>
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
          className="w-full h-3 rounded-full bg-slate-700 cursor-pointer hover:h-4 transition-all"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>{fmt(pos)}</span>
          <span>{fmt(total)}</span>
        </div>
      </div>

      {/* Controles principales */}
      <div className="flex items-center justify-between">
        {/* Controles de navegación */}
        <div className="flex items-center gap-2">
          {onPreviousClick && (
            <button
              onClick={onPreviousClick}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Canción anterior"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <button
            onClick={() => skipTime(-10)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Retroceder 10s"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white transition-all shadow-lg hover:scale-105"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={() => skipTime(10)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Avanzar 10s"
          >
            <SkipForward size={20} />
          </button>

          {onSkipClick && (
            <button
              onClick={onSkipClick}
              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors border border-blue-500/30"
              title="Siguiente canción"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Control de volumen */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
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
            onChange={handleVolumeChange}
            className="w-24 h-2 rounded-lg appearance-none bg-slate-700 cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            title="Volumen"
          />

          {onAddClick && (
            <button
              onClick={onAddClick}
              className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors ml-2 border border-purple-500/30"
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

