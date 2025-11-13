import Link from "next/link";
import RoomCard from "../RoomCard";
import type { RoomWithStats } from "../../lib/mockApi";
import { RoomsSkeleton } from "./RoomsSkeleton";

type RoomsSectionProps = {
  rooms: RoomWithStats[];
  loading: boolean;
  error: string | null;
};

export function RoomsSection({ rooms, loading, error }: RoomsSectionProps) {
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
          {rooms.length} salas disponibles
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <RoomsSkeleton />
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">
          <p className="mb-2 font-medium">Todavía no hay salas activas.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r as any} />
          ))}
        </div>
      )}
    </section>
  );
}
