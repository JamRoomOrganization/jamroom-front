import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import React from "react";
import type { LobbyRoom } from "../types";

const RoomCard = React.memo(function RoomCard({ room }: { room: LobbyRoom }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const participantCount = room.member_count || room.participants || 0;
  const trackCount = room.current_track_count || 0;
  const hostName = room.host?.displayName || 'Anónimo';

  const handleJoinRoom = () => {
    if (!user) {
      router.push(`/login?redirect=/room/${room.id}`);
    } else {
      router.push(`/room/${room.id}`);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-1">
          {room.name}
        </h3>
        <div className="flex items-center space-x-1 bg-slate-700/50 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-slate-300 text-sm">
            {participantCount}
          </span>
        </div>
      </div>

      {room.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {room.description}
        </p>
      )}

      {/* Información adicional */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span>Creada por: {hostName}</span>
        <span>{trackCount} tracks</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {[...Array(Math.min(3, participantCount))].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-2 border-slate-800"
            />
          ))}
          {participantCount > 3 && (
            <div className="w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs text-slate-300">
              +{participantCount - 3}
            </div>
          )}
        </div>

        <button
          onClick={handleJoinRoom}
          disabled={authLoading}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg group-hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {authLoading ? "Cargando..." : "Unirse"}
        </button>
      </div>
    </div>
  );
});

export default RoomCard;