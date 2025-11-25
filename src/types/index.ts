export type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  url?: string;
  streamUrl?: string;
  audioUrl?: string;
  artworkUrl?: string;
  cover_url?: string;
  source?: "audius" | "other";
};
export type Participant = { id: string; name: string; role: "host" | "listener" | "moderator" };
export type Room = { id: string; name: string; queue: Track[]; participants: Participant[] };
export type ChatMessage = { id: string; user: string; text: string; ts: string };

export type LobbyRoom = {
  id: string;
  name: string;
  description?: string;
  participants?: number;
};