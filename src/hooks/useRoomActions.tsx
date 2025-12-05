"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useRoomActions(roomId?: string) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();

  const deleteRoom = async () => {
    if (!roomId) return;
    try {
      await api.delete(`/api/rooms/${roomId}`, true);
      router.push('/');
    } catch (error) {
      console.error("[useRoomActions] Error deleting room:", error);
      throw error;
    }
  };

  const leaveRoom = async () => {
    if (!roomId) return;
    try {
      router.push('/');
    } catch (error) {
      console.error("[useRoomActions] Error leaving room:", error);
      throw error;
    }
  };

  const removeMember = async (targetUserId: string) => {
    if (!roomId) return;
    try {
      await api.delete(`/api/rooms/${roomId}/members/${targetUserId}`, true);
    } catch (error) {
      console.error("[useRoomActions] Error removing member:", error);
      throw error;
    }
  };

  return {
    deleteRoom,
    leaveRoom,
    removeMember,
  };
}