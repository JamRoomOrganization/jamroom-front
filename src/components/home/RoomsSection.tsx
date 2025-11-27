"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import RoomCard from "../RoomCard";
import type { LobbyRoom } from "../../types";
import { RoomsSkeleton } from "./RoomsSkeleton";

type RoomsSectionProps = {
  rooms: LobbyRoom[];
  loading: boolean;
  error: string | null;
};

export function RoomsSection({
  rooms,
  loading,
  error,
}: RoomsSectionProps) {
  // Paginación en cliente
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8; // salas por página

  const totalRooms = rooms.length;
  const totalPages = Math.max(1, Math.ceil(totalRooms / pageSize));

  // Cuando cambia el número de salas, resetear página si hace falta
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return rooms.slice(startIndex, startIndex + pageSize);
  }, [rooms, currentPage, pageSize]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <section id="rooms-section" className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Salas activas
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Únete a una sesión existente o crea la tuya desde cero.
          </p>
        </div>

        <span className="text-slate-300 bg-slate-900/70 px-4 py-2 rounded-full border border-slate-700/80 text-sm">
          {totalRooms} salas disponibles
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <RoomsSkeleton />
      ) : totalRooms === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">
          <p className="mb-2 font-medium">
            Todavía no hay salas activas.
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Crea la primera sala y empieza una sesión colaborativa.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            Crear sala ahora
          </Link>
        </div>
      ) : (
        <>
          {/* Grid de salas paginadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedRooms.map((r) => (
              <RoomCard key={r.id} room={r as any} />
            ))}
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-300">
                Mostrando{" "}
                <span className="font-semibold">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold">
                  {Math.min(currentPage * pageSize, totalRooms)}
                </span>{" "}
                de{" "}
                <span className="font-semibold">
                  {totalRooms}
                </span>{" "}
                salas
              </div>

              <div className="inline-flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 text-slate-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/80 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-300">
                  Página{" "}
                  <span className="font-semibold">
                    {currentPage}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold">
                    {totalPages}
                  </span>
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 text-slate-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/80 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

