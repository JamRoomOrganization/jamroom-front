"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import Header from "../components/Header";
import { fetchPublicRooms } from "../lib/api";
import type { LobbyRoom } from "../types";
import { HomeHero } from "../components/home/HomeHero";
import { RoomsSection } from "../components/home/RoomsSection";

export default function Home() {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Para evitar setState después de un unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadRooms = useCallback(
    async (options?: { showLoader?: boolean }) => {
      const showLoader = options?.showLoader ?? false;

      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await fetchPublicRooms();

        const transformedData: LobbyRoom[] = data.map((room: any) => ({
          ...room,
          participants: room.member_count,
        }));

        if (mountedRef.current) {
          setRooms(transformedData);
        }
      } catch (e: any) {
        console.error("[home] fetchPublicRooms error", e);
        if (mountedRef.current) {
          setError("No fue posible cargar las salas activas.");
        }
      } finally {
        if (showLoader && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadRooms({ showLoader: true });

    const intervalId = setInterval(() => {
      loadRooms({ showLoader: false });
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadRooms]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HomeHero />
        <RoomsSection rooms={rooms} loading={loading} error={error} />
      </main>
    </div>
  );
}

