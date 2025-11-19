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
      await api.post(
        `/api/rooms/${roomId}/members/ensure`,
        {}, true
      );

      const data = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      setMembers(data);
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
