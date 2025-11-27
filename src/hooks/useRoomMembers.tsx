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
  isMember: boolean; 
  reload: () => Promise<void>;
  updateMemberPermissions: (
    targetUserId: string,
    permissions: any
  ) => Promise<void>;
};

export function useRoomMembers(roomId?: string): UseRoomMembersResult {
  const [members, setMembers] = React.useState<RoomMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMember, setIsMember] = React.useState(true);

  // Carga de miembros (SOLO GET, sin ensure)
  const loadMembers = React.useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      setMembers(result.data ?? []);
      setIsMember(true); // si pasa requireRoomMember, sigue siendo miembro
    } catch (err: any) {
      console.error("[useRoomMembers] error", err);

      // Intentamos extraer status HTTP si el wrapper lo trae
      const status =
        err?.response?.status ??
        err?.status ??
        err?.code ??
        undefined;

      // Si el backend responde 403/404 en /members, el usuario ya no es miembro
      if (status === 403 || status === 404) {
        console.warn("[useRoomMembers] usuario ya no es miembro de la sala");
        setIsMember(false);
        setMembers([]);
        // No mostramos mensaje rojo de error aquí; la lógica de expulsión se maneja en RoomPage
        setError(null);
      } else {
        setError(err?.message || "Error cargando participantes.");
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Asegurar membresía SOLO una vez cuando el usuario entra a la sala
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
        // Si esto falla, igualmente loadMembers indicará si es miembro o no
      }
    };

    ensureMembership();
  }, [roomId]);

  // Carga inicial de miembros
  React.useEffect(() => {
    if (!roomId) return;
    loadMembers();
  }, [roomId, loadMembers]);

  // Polling cada 5 segundos SOLO de /members
  React.useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(() => {
      loadMembers();
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId, loadMembers]);

  React.useEffect(() => {
    console.log("[useRoomMembers] members state updated:", members);
  }, [members]);

  // Actualizar permisos y recargar lista
  const updateMemberPermissions = React.useCallback(
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
        console.error("[useRoomMembers] Error updating permissions:", error);
        throw error;
      }
    },
    [roomId, loadMembers]
  );

  return {
    members,
    loading,
    error,
    isMember,
    reload: loadMembers,
    updateMemberPermissions,
  };
}



