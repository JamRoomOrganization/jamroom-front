import React from "react";

export function RoomLoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center animate-fadeIn">
        {/* Spinner con efecto de onda */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-blue-500/30 rounded-full" />
          <div className="absolute inset-2 border-4 border-blue-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          {/* Icono de música */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>
        
        {/* Texto de carga */}
        <p className="text-white text-lg sm:text-xl font-medium mb-2">
          Cargando sala…
        </p>
        <p className="text-slate-400 text-sm">
          Preparando tu experiencia musical
        </p>
        
        {/* Dots animados */}
        <div className="flex justify-center gap-1.5 mt-4">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
