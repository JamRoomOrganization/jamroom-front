"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import RoomCard from "../components/RoomCard";
import { fetchRooms } from "../lib/mockApi";

export default function Home() {
  const [rooms, setRooms] = useState<any[]>([]);
  
  useEffect(() => {
    fetchRooms().then(setRooms);
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Colabora en{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Tiempo Real
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Crea salas de música, comparte tus canciones y colabora con artistas de todo el mundo.
          </p>
          <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
            Crear Mi Sala
          </button>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              Salas Activas
            </h2>
            <span className="text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full">
              {rooms.length} salas disponibles
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map(r => <RoomCard key={r.id} room={r} />)}
          </div>
        </div>
      </main>
    </div>
  );
}