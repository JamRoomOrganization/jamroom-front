"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import RoomCard from "../components/RoomCard";
import { fetchPublicRooms } from "../lib/api";
import type { LobbyRoom } from "../types";
import { HomeHero } from "../components/home/HomeHero";
import { RoomsSection } from "../components/home/RoomsSection";

export default function Home() {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchPublicRooms(); 
        
        const transformedData = data.map(room => ({
          ...room,
          participants: room.member_count 
        }));
        
        if (mounted) {
          setRooms(transformedData); 
        }
      } catch (e: any) {
        console.error("[home] fetchPublicRooms error", e);
        if (mounted) setError("No fue posible cargar las salas activas.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HomeHero/>
        <RoomsSection rooms={rooms} loading={loading} error={error} />
      </main>
    </div>
  );
}
