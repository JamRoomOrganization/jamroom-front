"use client";

import * as React from "react";
import { api } from "@/lib/api";

export type RoomMember = {
  room_id: string;
  user_id: string;
  roles: string[] | null;
  username?: string;
  preferred_username?: string;
  nickname?: string;
  can_add_tracks: boolean;
  can_control_playback: boolean;
  can_invite: boolean;
  created_at: string;
  updated_at: string;
};

type UseRoomMembersResult = {
  members: RoomMember[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateMemberPermissions: (
    targetUserId: string,
    permissions: any
  ) => Promise<void>;
  /**
   * null  -> aún no sabemos
   * true  -> es miembro
   * false -> backend dice que ya no es miembro (403)
   */
  isMember: boolean | null;
};

/**
 * Compara dos arrays de miembros para detectar cambios reales.
 * Retorna true si hay cambios significativos.
 */
function hasMembersChanged(prev: RoomMember[], next: RoomMember[]): boolean {
  if (prev.length !== next.length) return true;
  
  const prevIds = new Set(prev.map(m => m.user_id));
  const nextIds = new Set(next.map(m => m.user_id));
  
  // Verificar si hay nuevos miembros o miembros eliminados
  for (const id of nextIds) {
    if (!prevIds.has(id)) return true;
  }
  for (const id of prevIds) {
    if (!nextIds.has(id)) return true;
  }
  
  // Verificar cambios en roles o permisos
  for (const nextMember of next) {
    const prevMember = prev.find(m => m.user_id === nextMember.user_id);
    if (!prevMember) return true;
    
    // Comparar roles
    const prevRoles = (prevMember.roles || []).sort().join(',');
    const nextRoles = (nextMember.roles || []).sort().join(',');
    if (prevRoles !== nextRoles) return true;
    
    // Comparar permisos
    if (
      prevMember.can_add_tracks !== nextMember.can_add_tracks ||
      prevMember.can_control_playback !== nextMember.can_control_playback ||
      prevMember.can_invite !== nextMember.can_invite
    ) {
      return true;
    }
  }
  
  return false;
}

export function useRoomMembers(roomId?: string): UseRoomMembersResult {
  const [members, setMembers] = React.useState<RoomMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMember, setIsMember] = React.useState<boolean | null>(null);
  
  // Ref para comparar miembros y evitar actualizaciones innecesarias
  const membersRef = React.useRef<RoomMember[]>([]);
  // Ref para evitar múltiples llamadas simultáneas
  const isFetchingRef = React.useRef(false);

  const loadMembers = React.useCallback(async () => {
    if (!roomId) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;

    try {
      const result = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      const newMembers = result.data ?? [];
      
      // Solo actualizar estado si hay cambios reales
      if (hasMembersChanged(membersRef.current, newMembers)) {
        console.log("[useRoomMembers] Cambios detectados en miembros:", {
          prev: membersRef.current.length,
          next: newMembers.length,
        });
        membersRef.current = newMembers;
        setMembers(newMembers);
      }
      
      setIsMember(true);
      setError(null);
    } catch (err: any) {
      console.error("[useRoomMembers] error", err);

      const msg: string =
        err?.message ||
        err?.data?.message ||
        "Error cargando participantes.";

      setError(msg);

      const lower = msg.toLowerCase();

      // Si el backend dice explícitamente que no es miembro -> marcar isMember = false
      if (
        err?.status === 403 ||
        lower.includes("not a member of this room") ||
        lower.includes("not a member")
      ) {
        setIsMember(false);
        membersRef.current = [];
        setMembers([]);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [roomId]);

  // Asegurar membresía SOLO una vez al entrar en la sala.
  // Si el usuario entra por primera vez, esto lo "registra" en room_members.
  React.useEffect(() => {
    if (!roomId) return;

    const ensureMembership = async () => {
      try {
        await api.post(
          `/api/rooms/${roomId}/members/ensure`,
          {},
          true
        );
      } catch (err) {
        console.error("[useRoomMembers] error en ensureMembership", err);
        // Si aquí hubiera 403 (no debería), no tocamos isMember;
        // el backend sólo debería negar si no está autenticado.
      }
    };

    ensureMembership();
  }, [roomId]);

  // Primera carga explícita
  React.useEffect(() => {
    if (!roomId) return;
    loadMembers();
  }, [roomId, loadMembers]);

  // Polling periódico mientras siga siendo miembro (aumentado a 10s para reducir carga)
  React.useEffect(() => {
    if (!roomId) return;
    if (isMember === false) {
      // Si ya sabemos que NO es miembro, dejamos de hacer polling
      return;
    }

    const interval = setInterval(() => {
      loadMembers();
    }, 10000); // 10 segundos (aumentado de 5s para reducir actualizaciones)

    return () => clearInterval(interval);
  }, [roomId, loadMembers, isMember]);

  return {
    members,
    loading,
    error,
    reload: loadMembers,
    updateMemberPermissions: React.useCallback(
      async (targetUserId: string, permissions: any) => {
        if (!roomId) return;

        try {
          await api.patch(
            `/api/rooms/${roomId}/members/${targetUserId}/permissions`,
            permissions,
            true
          );
          await loadMembers();
        } catch (error) {
          console.error(
            "[useRoomMembers] Error updating permissions:",
            error
          );
          throw error;
        }
      },
      [roomId, loadMembers]
    ),
    isMember,
  };
}




