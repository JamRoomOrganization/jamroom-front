"use client";

import React from "react";
import Header from "../../../components/Header";
import PlayerMock from "../../../components/PlayerMock";
import QueueList from "../../../components/QueueList";
import ChatMock from "../../../components/ChatMock";
import ParticipantsList from "../../../components/ParticipantsList";
import { useRoom } from "../../../hooks/useRoom";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { room, loading, skipTrack } = useRoom(id);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Cargando sala...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {room?.name}
              </h1>
              <p className="text-slate-400 text-lg">
                Sala de colaboración musical
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105">
                Invitar Amigos
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PlayerMock track={room?.queue?.[0]} />
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Controles</h3>
              <div className="flex gap-4">
                <button className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105">
                  Añadir Canción
                </button>
                <button 
                  onClick={() => skipTrack()} 
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                >
                  Siguiente Canción
                </button>
              </div>
            </div>
            
            <QueueList queue={room?.queue} />
          </div>

          <aside className="space-y-6">
            <ParticipantsList participants={room?.participants} />
            <ChatMock />
          </aside>
        </div>
      </main>
    </div>
  );
}