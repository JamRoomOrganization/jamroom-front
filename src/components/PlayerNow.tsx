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
  isPlaying?: boolean;
  onPlayPause?: (nextIsPlaying: boolean) => void;
  onSeek?: (positionSeconds: number) => void;
  hasUserInteracted?: boolean;
  forcePlay?: () => Promise<boolean>;
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
  isPlaying: isPlayingProp,
  onPlayPause,
  onSeek,
  hasUserInteracted,
  forcePlay,
}: PlayerNowProps) {
  const [pos, setPos] = React.useState(0);
  const [total, setTotal] = React.useState(track?.duration ?? 240);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  // Usar directamente isPlaying del prop (viene del sync-service)
  const isPlaying = isPlayingProp ?? false;

  // Sincronizar con eventos del audio
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setPos(audio.currentTime);
    const handleDurationChange = () => setTotal(audio.duration);
    const handleVolumeChange = () => setVolume(audio.volume);

    const handleEnded = () => {
      console.log('[PlayerNow] Canción terminada, saltando a siguiente');
      onSkipClick?.();
    };

    const handleStalled = () => {
      console.warn('[PlayerNow] Audio detenido (stalled), intentando reanudar');
      if (!audio.paused && isPlaying) {
        audio.load();
        audio.play().catch(err => {
          console.error('[PlayerNow] Error al reanudar tras stalled:', err);
        });
      }
    };

    const handleWaiting = () => {
      console.log('[PlayerNow] Audio buffering...');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [audioRef, onSkipClick, isPlaying]);

  const pct = Math.min(100, (pos / Math.max(total, 1)) * 100);

  // Control de reproducción/pausa - Delegar completamente al servidor
  const togglePlayPause = () => {
    console.log('[PlayerNow] togglePlayPause clicked, current isPlaying:', isPlaying);

    // Evitar emitir si no hay ninguna canción cargada
    if (!track) {
      console.warn('[PlayerNow] ⚠ No hay pista seleccionada');
      return;
    }

    // Solo notificar al servidor, él enviará syncPacket que controlará el audio
    if (onPlayPause) {
      const nextState = !isPlaying;
      console.log('[PlayerNow] 🎵 Cambiando estado a:', nextState ? 'playing' : 'paused');
      onPlayPause(nextState);
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
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const targetSeconds = (x / rect.width) * total;

    if (onSeek) {
      // Si el padre controla la lógica, delegamos en él
      onSeek(targetSeconds);
    } else {
      // Fallback: comportamiento local actual
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = targetSeconds;
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      {/* Audio oculto - solo para funcionalidad */}
      <audio
        ref={audioRef}
        className="hidden"
        crossOrigin="anonymous"
        preload="auto"
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

      {/* Mensaje de advertencia si se requiere interacción del usuario */}
      {isPlaying && !hasUserInteracted && (
        <div
          className="mb-4 p-4 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 border-2 border-yellow-400 rounded-xl text-white cursor-pointer hover:from-yellow-500/50 hover:to-orange-500/50 transition-all animate-pulse shadow-lg shadow-yellow-500/30"
          onClick={async () => {
            console.log('[PlayerNow] Banner clickeado - reproducción inmediata');

            const audio = audioRef.current;
            if (!audio) {
              console.warn('[PlayerNow] No hay ref de audio');
              return;
            }

            try {
              // ✅ Reproducir INMEDIATAMENTE sin esperar forcePlay
              await audio.play();

              console.log('[PlayerNow] ✓ Reproducción iniciada (sin delay)');

              // ✅ Notificar al servidor DESPUÉS (no bloquea la UI)
              if (forcePlay) {
                forcePlay().catch(err => {
                  console.warn('[PlayerNow] Error en forcePlay (no crítico):', err);
                });
              }
            } catch (err: any) {
              console.error('[PlayerNow] Error al reproducir:', err);

              // Solo si falla, intentar con forcePlay
              if (forcePlay && err.name === 'NotAllowedError') {
                await forcePlay();
              }
            }
          }}
        >
          <p className="flex items-center gap-3 text-lg font-bold">
            <svg className="w-7 h-7 flex-shrink-0 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>🎵 ¡Haz clic aquí para activar el audio!</span>
          </p>
          <p className="mt-2 text-sm text-yellow-100 ml-10 font-medium">
            Hay música reproduciéndose. Los navegadores requieren tu interacción para comenzar a escuchar.
          </p>
        </div>
      )}

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
          className="relative w-full h-3 rounded-full bg-slate-700 cursor-pointer hover:h-4 transition-all group"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all relative"
            style={{ width: `${pct}%` }}
          />
          {/* Indicador hover */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="absolute inset-0 rounded-full ring-2 ring-purple-400/30" />
          </div>
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
            disabled={!track}
            className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white transition-all shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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

