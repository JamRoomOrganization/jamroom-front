import React from "react";
import Link from "next/link";
import type { LobbyRoom } from "../types";

export default function RoomCard({ room }: { room: LobbyRoom }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-1">
          {room.name}
        </h3>
        <div className="flex items-center space-x-1 bg-slate-700/50 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-slate-300 text-sm">
            {room.participants ?? 0}
          </span>
        </div>
      </div>

      {room.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {room.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {[...Array(Math.min(3, room.participants || 0))].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-2 border-slate-800"
            />
          ))}
          {(room.participants || 0) > 3 && (
            <div className="w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs text-slate-300">
              +{(room.participants || 0) - 3}
            </div>
          )}
        </div>

        <Link
          href={`/room/${room.id}`}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg group-hover:shadow-purple-500/25"
        >
          Unirse
        </Link>
      </div>
    </div>
  );
}
