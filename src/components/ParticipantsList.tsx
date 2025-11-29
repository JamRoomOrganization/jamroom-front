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

  // Controla qué menú kebab está abierto
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const getDisplayName = (member: RoomMember) => {
    return (
      member.nickname ||
      member.preferred_username ||
      member.username ||
      "Usuario"
    );
  };

  const displayMembers: RoomMember[] =
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

  const totalParticipants = displayMembers.length;

  const toggleMenuFor = (memberId: string) => {
    setOpenMenuFor((current) => (current === memberId ? null : memberId));
  };

  const closeMenu = () => setOpenMenuFor(null);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-white font-semibold text-sm sm:text-base">
          Participantes
        </h4>
        {totalParticipants > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs text-slate-300 bg-slate-900/60 border border-slate-700/70 rounded-full">
            {totalParticipants}
          </span>
        )}
      </div>

      {totalParticipants === 0 ? (
        <div className="text-slate-400 text-sm">Aún no hay participantes.</div>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
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

                {/* Contenedor principal: info a la izquierda, menú a la derecha */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    {/* Info: nombre + rol + puntos */}
                    <div className="min-w-0">
                      <div className="text-sm text-slate-100 truncate">
                        {getDisplayName(member)}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                          {isHostMember ? "Host" : "Miembro"}
                        </span>

                        {/* Puntos de permisos (solo miembros, no host) */}
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

                    {/* Menú kebab para host (no se muestra en el host) */}
                    {isHost &&
                      !isHostMember &&
                      (onUpdatePermissions || onRemoveMember) && (
                        <div className="relative flex-shrink-0 mt-1 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => toggleMenuFor(member.user_id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/60 border border-slate-600/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                            aria-label="Acciones sobre este participante"
                            title="Más acciones"
                          >
                            ⋯
                          </button>

                          {isMenuOpen && (
                            <div
                              className={`
                                absolute z-20 w-44 rounded-md bg-slate-900 border border-slate-700 shadow-lg py-1
                                right-0 top-full mt-2
                                sm:mt-0 sm:top-0 sm:left-full sm:right-auto sm:ml-2
                              `}
                            >
                              {onUpdatePermissions && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowPermissionsModal(true);
                                    closeMenu();
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
                                    onRemoveMember(
                                      member.user_id,
                                      getDisplayName(member)
                                    );
                                    closeMenu();
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




