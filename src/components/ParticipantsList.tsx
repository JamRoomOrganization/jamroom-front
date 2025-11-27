// components/ParticipantsList.tsx (actualizado)
"use client";

import React, { useState } from "react";
import { RoomMember } from "@/hooks/useRoomMembers";
import { MemberPermissionsModal } from "./MemberPermissionsModal";

type ParticipantsListProps = {
  participants?: Array<{ id: string; name: string; role?: string }>;
  members?: RoomMember[];
  isHost?: boolean;
  onUpdatePermissions?: (targetUserId: string, permissions: any) => Promise<void>;
  onRemoveMember?: (targetUserId: string) => Promise<void>; // ← Nueva prop
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
  onRemoveMember // ← Nueva prop
}: ParticipantsListProps) {
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const getDisplayName = (member: RoomMember) => {
    return member.nickname || member.preferred_username || member.username || 'Usuario';
  };

  const displayMembers = members.length > 0 ? members : participants.map(p => ({
    user_id: p.id,
    room_id: '',
    roles: p.role ? [p.role] : ['member'],
    username: p.name,
    preferred_username: undefined,
    nickname: undefined,
    can_add_tracks: false,
    can_control_playback: false,
    can_invite: false,
    created_at: '',
    updated_at: ''
  }));

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h4 className="text-white font-semibold mb-3">Participantes</h4>
      {displayMembers.length === 0 ? (
        <div className="text-slate-400 text-sm">Aún no hay participantes.</div>
      ) : (
        <ul className="space-y-3">
          {displayMembers.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-xs text-white border border-slate-700/50">
                  {initials(getDisplayName(member))}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 truncate">{getDisplayName(member)}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {member.roles?.includes('host') ? 'Host' : 'Miembro'}
                    {!member.roles?.includes('host') && (
                      <span className="ml-2 text-slate-500">
                        • {member.can_add_tracks ? '🎵' : ''} {member.can_control_playback ? '⏯️' : ''} {member.can_invite ? '👥' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">              
                {/* Botones de acciones para el host */}
                {isHost && !member.roles?.includes('host') && (
                  <div className="flex gap-1">
                    {onUpdatePermissions && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowPermissionsModal(true);
                        }}
                        className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 rounded border border-purple-400/30 hover:border-purple-400/50 transition-colors"
                        title="Editar permisos"
                      >
                        Permisos
                      </button>
                    )}
                    {onRemoveMember && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${getDisplayName(member)} de la sala?`)) {
                            onRemoveMember(member.user_id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-400/30 hover:border-red-400/50 transition-colors"
                        title="Eliminar miembro"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de permisos */}
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