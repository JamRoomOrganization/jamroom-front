import React from "react";
import Header from "@/components/Header";

type RoomErrorStateProps = {
  error: string;
  roomId: string;
  socketStatus: string;
  onCreateRoom: () => void;
  onGoHome: () => void;
  onRetry: () => void;
  onReLogin: () => void;
};

export function RoomErrorState({
  error,
  roomId,
  socketStatus,
  onCreateRoom,
  onGoHome,
  onRetry,
  onReLogin,
}: RoomErrorStateProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  const is404 =
    error.includes("404") ||
    error.toLowerCase().includes("not found") ||
    error.toLowerCase().includes("no existe");

  const isAuthError = socketStatus === "authError";
  
  const isConnectionError = 
    error.toLowerCase().includes("connection") ||
    error.toLowerCase().includes("network") ||
    error.toLowerCase().includes("conexión");

  const handleRetry = () => {
    setIsRetrying(true);
    onRetry();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div
          className={`border rounded-2xl p-6 sm:p-8 text-center animate-fadeIn transition-all duration-300 ${
            is404
              ? "bg-yellow-900/20 border-yellow-500/50"
              : "bg-red-900/20 border-red-500/50"
          }`}
        >
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 ${
              is404 ? "bg-yellow-500/20" : "bg-red-500/20"
            }`}
          >
            {is404 ? (
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : isConnectionError ? (
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
            ) : (
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            {is404
              ? "Sala no encontrada"
              : isAuthError
              ? "Sin permisos para controlar la sala"
              : isConnectionError
              ? "Error de conexión"
              : "Error al cargar la sala"}
          </h2>

          <p
            className={`mb-6 text-sm sm:text-base ${
              is404 ? "text-yellow-200" : "text-red-200"
            }`}
          >
            {is404 ? `La sala "${roomId}" no existe en el sistema.` : error}
          </p>

          <div className="space-y-3">
            {is404 ? (
              <>
                <button
                  onClick={onCreateRoom}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-150 active:scale-[0.98] shadow-lg shadow-purple-500/20"
                >
                  Crear una sala nueva
                </button>
                <button
                  onClick={onGoHome}
                  className="block w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all duration-150 active:scale-[0.98]"
                >
                  Ver salas disponibles
                </button>
              </>
            ) : (
              <>
                {isAuthError ? (
                  <button
                    onClick={onReLogin}
                    className="w-full sm:w-auto px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-all duration-150 active:scale-[0.98]"
                  >
                    Volver a iniciar sesión
                  </button>
                ) : (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-600/50 text-white rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRetrying ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Reintentando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reintentar
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {!is404 && !isAuthError && (
              <div className="text-slate-400 text-xs sm:text-sm mt-2">
                <p>Asegúrate de que:</p>
                <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  <li>• El backend esté corriendo</li>
                  <li>• El sync-service esté accesible (WebSocket)</li>
                  <li>• No haya problemas de red o CORS</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
