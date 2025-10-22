import { useState, useEffect } from 'react';

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setRoom({
        id: roomId,
        name: `Sala ${roomId}`,
        participants: [
          { id: 1, name: 'Usuario 1' },
          { id: 2, name: 'Usuario 2' },
        ],
        queue: [
          { id: 1, title: 'Canción 1', artist: 'Artista 1' },
          { id: 2, title: 'Canción 2', artist: 'Artista 2' },
        ],
      });
      setLoading(false);
    }, 1000);
  }, [roomId]);

  const skipTrack = () => {
    console.log('Skipping track...');
  };

  return { room, loading, skipTrack };
}
