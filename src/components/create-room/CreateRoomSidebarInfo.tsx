import React from "react";

export const CreateRoomSidebarInfo: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <h3 className="text-white font-semibold mb-2 text-lg">
        ¿Qué es una sala?
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Una sala es un espacio sincronizado donde varios usuarios escuchan
        la misma canción al mismo tiempo, con cola compartida y chat en vivo.
      </p>

      <ul className="space-y-2 text-sm text-slate-300">
        <li className="flex items-start gap-2">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>
            Puedes controlar la reproducción desde cualquier dispositivo
            autorizado.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>
            Tus amigos verán el nombre y la descripción que definas aquí.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>
            Más adelante podrás añadir votaciones, recomendaciones y reglas
            avanzadas por sala.
          </span>
        </li>
      </ul>
    </div>
  );
};
