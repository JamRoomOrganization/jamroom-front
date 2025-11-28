"use client";

import React, { useState } from "react";
import { RoomMember } from "@/hooks/useRoomMembers";
import { MemberPermissionsModal } from "./MemberPermissionsModal";

type ParticipantsListProps = {
  participants?: Array<{ id: string; name: string; role?: string }>;
  members?: RoomMember[];
  isHost?: boolean;
  onUpdatePermissions?: (
    targetUserId: string,
    permissions: any
  ) => Promise<void>;
  onRemoveMember?: (targetUserId: string, targetName: string) => void;
};

function initials(name?: string) {
  const safe = (name ?? "").trim() || "Usuario";
  const parts = safe.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const result = (first + second).toUpperCase();
  return result || "U";
}

const ParticipantsList = React.memo(function ParticipantsList({
  participants = [],
  members = [],
  isHost = false,
  onUpdatePermissions,
  onRemoveMember,
}: ParticipantsListProps) {
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Para controlar qué menú kebab está abierto
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const getDisplayName = (member: RoomMember) => {
    return (
      member.nickname ||
      member.preferred_username ||
      member.username ||
      "Usuario"
    );
  };

  const displayMembers =
    members.length > 0
      ? members
      : participants.map((p) => ({
          user_id: p.id,
          room_id: "",
          roles: p.role ? [p.role] : ["member"],
          username: p.name,
          preferred_username: undefined,
          nickname: undefined,
          can_add_tracks: false,
          can_control_playback: false,
          can_invite: false,
          created_at: "",
          updated_at: "",
        }));

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h4 className="text-white font-semibold mb-3">Participantes</h4>

      {displayMembers.length === 0 ? (
        <div className="text-slate-400 text-sm">Aún no hay participantes.</div>
      ) : (
        <ul className="space-y-3">
          {displayMembers.map((member) => {
            const isHostMember = member.roles?.includes("host");
            const isMenuOpen = openMenuFor === member.user_id;

            const hasAnyPermission =
              member.can_add_tracks ||
              member.can_control_playback ||
              member.can_invite;

            return (
              <li
                key={member.user_id}
                className="flex items-center gap-3 py-1.5"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-xs text-white border border-slate-700/50 flex-shrink-0">
                  {initials(getDisplayName(member))}
                </div>

                {/* Contenedor principal: info a la izquierda, menú de acciones a la derecha */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    {/* Bloque de info: nombre + rol + puntos de permisos */}
                    <div className="min-w-0">
                      {/* Nombre */}
                      <div className="text-sm text-slate-100 truncate">
                        {getDisplayName(member)}
                      </div>

                      {/* Rol + indicadores de permisos como puntos de color */}
                      <div className="mt-0.5 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                          {isHostMember ? "Host" : "Miembro"}
                        </span>

                        {/* Solo mostramos puntos para miembros (no host) y si tienen algún permiso */}
                        {!isHostMember && hasAnyPermission && (
                          <div className="flex items-center gap-1">
                            {member.can_add_tracks && (
                              <span
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                title="Permiso: puede añadir canciones a la cola de esta sala"
                                aria-label="Permiso para añadir canciones a la cola"
                              />
                            )}
                            {member.can_control_playback && (
                              <span
                                className="w-2 h-2 rounded-full bg-sky-400"
                                title="Permiso: puede pausar, reanudar y cambiar la canción que se reproduce"
                                aria-label="Permiso para controlar la reproducción"
                              />
                            )}
                            {member.can_invite && (
                              <span
                                className="w-2 h-2 rounded-full bg-violet-400"
                                title="Permiso: puede invitar a otras personas a unirse a la sala"
                                aria-label="Permiso para invitar usuarios a la sala"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Menú kebab de acciones para el host (solo en miembros, no en host) */}
                    {isHost && !isHostMember && (onUpdatePermissions || onRemoveMember) && (
                      <div className="relative flex-shrink-0 mt-1 sm:mt-0">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuFor((current) =>
                              current === member.user_id ? null : member.user_id
                            )
                          }
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/60 border border-slate-600/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                          aria-label="Acciones sobre este participante"
                          title="Más acciones"
                        >
                          ⋯
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute top-0 left-full ml-2 w-40 rounded-md bg-slate-900 border border-slate-700 shadow-lg py-1 z-20"
                          >
                            {onUpdatePermissions && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setShowPermissionsModal(true);
                                  setOpenMenuFor(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 transition-colors"
                              >
                                Editar permisos
                              </button>
                            )}
                            {onRemoveMember && (
                              <button
                                type="button"
                                onClick={() => {
                                  onRemoveMember(member.user_id, getDisplayName(member));
                                  setOpenMenuFor(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-300 hover:bg-slate-800 transition-colors"
                              >
                                Eliminar miembro
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {onUpdatePermissions && (
        <MemberPermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          onUpdatePermissions={onUpdatePermissions}
        />
      )}
    </div>
  );
});

export default ParticipantsList;



