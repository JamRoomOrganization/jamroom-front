"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import RoomCard from "../components/RoomCard";
import { fetchRooms } from "../lib/mockApi";
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
        const data = await fetchRooms();
        if (mounted) {
          setRooms(data); 
        }
      } catch (e: any) {
        console.error("[home] fetchRooms error", e);
        if (mounted) setError("No fue posible cargar las salas activas.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleScrollToRooms = () => {
    const el = document.getElementById("rooms-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HomeHero onScrollToRooms={handleScrollToRooms} />
        <RoomsSection rooms={rooms} loading={loading} error={error} />
      </main>
    </div>
  );
}
