export type Track = { id: string; title: string; artist: string; duration: number; url?: string };
export type Participant = { id: string; name: string; role: "host" | "listener" | "moderator" };
export type Room = { id: string; name: string; queue: Track[]; participants: Participant[] };
export type ChatMessage = { id: string; user: string; text: string; ts: string };
