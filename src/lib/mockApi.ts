import type { LobbyRoom } from "../types";

export async function fetchRooms(): Promise<LobbyRoom[]> {
  return [
    {
      id: "1",
      name: "Jazz & Blues Lounge",
      description: "Improvisación y standards de jazz tradicional",
      participants: 8,
    },
    {
      id: "2",
      name: "Rock Legends",
      description: "Desde los 60s hasta los 90s - solo lo mejor",
      participants: 12,
    },
    {
      id: "3",
      name: "Electronic Vibes",
      description: "Beats, sintetizadores y vibraciones futuristas",
      participants: 5,
    },
    {
      id: "4",
      name: "Acoustic Sessions",
      description: "Sesiones relajadas con guitarra acústica",
      participants: 6,
    },
    {
      id: "5",
      name: "Hip Hop Cypher",
      description: "Beats, freestyle y old school vibes",
      participants: 9,
    },
    {
      id: "6",
      name: "Metal Mayhem",
      description: "Power, velocidad y riffs pesados",
      participants: 4,
    },
  ];
}
