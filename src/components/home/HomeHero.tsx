import Link from "next/link";
import { FeaturePill } from "./FeaturePill";

type HomeHeroProps = {
  onScrollToRooms: () => void;
};

export function HomeHero({ onScrollToRooms }: HomeHeroProps) {
  return (
    <section className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 text-xs font-medium text-slate-300 mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>JamRoom • sesiones sincronizadas</span>
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
        Colabora en{" "}
        <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          tiempo real
        </span>
      </h1>

      <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
        Crea salas de escucha compartida, sincroniza la reproducción y
        construye sesiones musicales con tu equipo, tu comunidad o tus amigos.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
        <Link
          href="/create"
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-semibold text-base md:text-lg transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-500/25"
        >
          Crear mi sala
        </Link>

        <button
          type="button"
          onClick={onScrollToRooms}
          className="text-slate-200 hover:text-white border border-slate-600/80 hover:border-slate-400 px-6 py-3 rounded-full text-sm md:text-base font-medium transition-all bg-slate-900/40"
        >
          Explorar salas activas
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
        <FeaturePill
          title="Sincronización precisa"
          body="Todos escuchan la misma parte de la canción al mismo tiempo."
        />
        <FeaturePill
          title="Cola compartida"
          body="Agrega canciones a la cola y define el orden entre todos."
        />
        <FeaturePill
          title="Listo para recomendaciones"
          body="Tu historial de sala alimenta el motor de recomendaciones."
        />
      </div>
    </section>
  );
}
