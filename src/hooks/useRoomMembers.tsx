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
  updateMemberPermissions: (targetUserId: string, permissions: any) => Promise<void>;
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
        {},
        true
      );

      const result = await api.get<RoomMember[]>(
        `/api/rooms/${roomId}/members`,
        true
      );

      console.log("[useRoomMembers] /members response:", result);
      console.log("[useRoomMembers] /members first member:", result.data?.[0]);

      setMembers(result.data ?? []);
    } catch (err: any) {
      console.error("[useRoomMembers] error", err);
      setError(err?.message || "Error cargando participantes.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Función para actualizar permisos
  const updateMemberPermissions = React.useCallback(async (targetUserId: string, permissions: any) => {
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
  }, [roomId, loadMembers]);

  React.useEffect(() => {
    loadMembers();
  }, [loadMembers]);
  
  React.useEffect(() => {
    console.log("[useRoomMembers] members state updated:", members);
  }, [members]);

  return { 
    members, 
    loading, 
    error, 
    reload: loadMembers, 
    updateMemberPermissions 
  };
}


