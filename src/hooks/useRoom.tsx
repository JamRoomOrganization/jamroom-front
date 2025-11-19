import { useState, useEffect } from "react";
import { api } from "@/lib/api";

type Room = {
  id: string;
  name: string;
  participants: { id: string; name: string }[];
  queue: { id: string; title: string; artist: string }[];
};

type Member = {
  user_id: string;
  username: string;
};

type Track = {
  track_id: string;
  title: string;
  artist: string;
};

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const roomResponse: Room = await api.get(`/api/rooms/${roomId}`, true);
        const membersResponse: Member[] = await api.get(`/api/rooms/${roomId}/members`, true);
        const queueResponse: Track[] = await api.get(`/api/rooms/${roomId}/queue`, true);

        setRoom({
          id: roomResponse.id,
          name: roomResponse.name,
          participants: membersResponse.map((member) => ({
            id: member.user_id,
            name: member.username || "Usuario desconocido",
          })),
          queue: queueResponse.map((track) => ({
            id: track.track_id,
            title: track.title,
            artist: track.artist || "Desconocido",
          })),
        });
      } catch (err: any) {
        setError(err?.message || "Error al obtener la sala.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId]);

  return { room, loading, error };
}

