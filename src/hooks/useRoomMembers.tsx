"use client";

import * as React from "react";
import { api } from "@/lib/api";

export type RoomMember = {
  room_id: string;
  user_id: string;
  roles: string[] | null;
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
};

export function useRoomMembers(roomId?: string): UseRoomMembersResult {
  const [members, setMembers] = React.useState<RoomMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMembers = React.useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) Aseguramos que el usuario actual sea miembro de la sala
      await api.post(
        `/api/rooms/${roomId}/members/ensure`,
        {},
        true // auth = true, manda Bearer
      );

      // 2) Obtenemos la lista de miembros (si es host)
      const result = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      setMembers(result.data);
    } catch (err: any) {
      console.error("[useRoomMembers] error", err);
      setError(err?.message || "Error cargando participantes.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return { members, loading, error, reload: loadMembers };
}
