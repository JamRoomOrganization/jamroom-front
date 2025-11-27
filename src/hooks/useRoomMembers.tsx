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

export function useRoomMembers(roomId?: string): UseRoomMembersResult {
  const [members, setMembers] = React.useState<RoomMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMember, setIsMember] = React.useState<boolean | null>(null);

  const loadMembers = React.useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      console.log("[useRoomMembers] /members response:", result);
      console.log(
        "[useRoomMembers] /members first member:",
        result.data?.[0]
      );

      setMembers(result.data ?? []);
      setIsMember(true);
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
        // Opcionalmente vaciamos la lista
        setMembers([]);
      }
    } finally {
      setLoading(false);
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

  // Polling periódico mientras siga siendo miembro
  React.useEffect(() => {
    if (!roomId) return;
    if (isMember === false) {
      // Si ya sabemos que NO es miembro, dejamos de hacer polling
      return;
    }

    const interval = setInterval(() => {
      loadMembers();
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [roomId, loadMembers, isMember]);

  React.useEffect(() => {
    console.log("[useRoomMembers] members state updated:", members);
  }, [members]);

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




