import React from "react";

type RoomHeaderProps = {
  roomName?: string | null;
  participantsCount: number;
  syncLabel: string;
  syncDotClass: string;
  syncPulse: boolean;
  isHost: boolean;
  isLeaving: boolean;
  isDeleting: boolean;
  onInvite: () => void;
  onLeave: () => void;
  onDelete: () => void;
};

export function RoomHeader({
  roomName,
  participantsCount,
  syncLabel,
  syncDotClass,
  syncPulse,
  isHost,
  isLeaving,
  isDeleting,
  onInvite,
  onLeave,
  onDelete,
}: RoomHeaderProps) {
  return (
    <div className="mb-6">
      {/* Layout responsivo: en mobile apila título y botones, en sm+ se alinean */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Bloque de título + info de sala */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white truncate">
            {roomName ?? "Sala"}
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
            <span>Sala de colaboración musical</span>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/60 text-slate-100 border border-slate-700/80">
              <span
                className={[
                  "w-2 h-2 rounded-full",
                  syncDotClass,
                  syncPulse ? "animate-pulse" : "",
                ].join(" ")}
              />
              {syncLabel}
            </span>

            {!!participantsCount && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-200 border border-slate-600">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="opacity-80"
                >
                  <path
                    fill="currentColor"
                    d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m-7 8a7 7 0 0 1 14 0z"
                  />
                </svg>
                {participantsCount}
              </span>
            )}
          </div>
        </div>

        {/* Bloque de acciones: responsive */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={onInvite}
            className="flex-1 sm:flex-none min-w-[120px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 md:px-6 py-2.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02]"
          >
            Invitar
          </button>

          <button
            onClick={onLeave}
            disabled={isLeaving}
            className="flex-1 sm:flex-none min-w-[120px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 md:px-6 py-2.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isLeaving ? "Saliendo..." : "Abandonar"}
          </button>

          {isHost && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 sm:flex-none min-w-[120px] bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 md:px-6 py-2.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
