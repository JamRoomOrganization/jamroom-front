"use client";

import React from "react";
import Header from "@/components/Header";
import PlayerNow from "@/components/PlayerNow";
import QueueList from "@/components/QueueList";
import ChatPanel from "@/components/ChatPanel";
import ParticipantsList from "@/components/ParticipantsList";
import { useRoom } from "@/hooks/useRoom";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import InviteDialog from "@/components/InviteDialog";
import AddSongDialog from "@/components/AddSongDialog";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { useRoomQueue } from "@/hooks/useRoomQueue";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function RoomPage({ params }: PageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { id } = React.use(params);

  const {
    room,
    loading: roomLoading,
    error,
    skipTrack,
    changeTrackFromExternalStream,
    audioRef,
  } = useRoom(id);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState<any>(null);

  const {
    members,
    error: membersError,
  } = useRoomMembers(id);

  const {
    queue,
    loading: queueLoading,
    error: queueError,
    addTrack,
  } = useRoomQueue(id);

  // Actualizar currentTrack cuando cambia la cola
  React.useEffect(() => {
    if (queue && queue.length > 0) {
      // Si no hay currentTrack, usar la primera canción
      if (!currentTrack) {
        console.log('[Room] Inicializando currentTrack con primera canción:', queue[0]);
        setCurrentTrack(queue[0]);
      } else {
        // Si currentTrack existe, verificar que siga en la cola
        const stillInQueue = queue.find(t => t.id === currentTrack.id);
        if (!stillInQueue) {
          // Si la canción actual ya no está en la cola, usar la primera
          console.log('[Room] Canción actual no está en cola, usando primera:', queue[0]);
          setCurrentTrack(queue[0]);
        }
      }
    } else if (queue && queue.length === 0) {
      // Si la cola está vacía, limpiar currentTrack
      setCurrentTrack(null);
    }
  }, [queue, currentTrack]);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (!user && !authLoading) return null;

  // Combinar estados de carga
  const isLoading = roomLoading || authLoading || queueLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando sala…</p>
        </div>
      </div>
    );
  }

  // Mostrar error si no se pudo cargar la sala
  if (error) {
    const is404 = error.includes('404') || error.includes('not found') || error.includes('no existe');

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className={`border rounded-2xl p-8 text-center ${
            is404 
              ? 'bg-yellow-900/20 border-yellow-500/50' 
              : 'bg-red-900/20 border-red-500/50'
          }`}>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              is404 
                ? 'bg-yellow-500/20' 
                : 'bg-red-500/20'
            }`}>
              {is404 ? (
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              {is404 ? 'Sala no encontrada' : 'Error al cargar la sala'}
            </h2>

            <p className={`mb-6 ${is404 ? 'text-yellow-200' : 'text-red-200'}`}>
              {is404 ? `La sala "${id}" no existe en el sistema.` : error}
            </p>

            <div className="space-y-3">
              {is404 ? (
                <>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all"
                  >
                    Crear una sala nueva
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="block w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Ver salas disponibles
                  </button>
                </>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Reintentar
                </button>
              )}

              {!is404 && (
                <div className="text-slate-400 text-sm">
                  <p>Asegúrate de que:</p>
                  <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                    <li>• El backend esté corriendo</li>
                    <li>• No haya problemas de red o CORS</li>
                    <li>• Tienes conexión a internet</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Función para ir a la canción anterior
  const handlePrevious = () => {
    if (!queue || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);

    if (currentIndex > 0) {
      const previousTrack = queue[currentIndex - 1];
      console.log('[Room] Cambiando a canción anterior:', previousTrack);

      // Actualizar el estado current - PlayerNow se encargará del resto
      setCurrentTrack(previousTrack);
    } else {
      console.log('[Room] Ya estás en la primera canción');
    }
  };

  // Función para seleccionar una canción específica de la cola
  const handleSelectTrack = (trackId: string) => {
    if (!queue) return;

    const selectedTrack = queue.find(t => t.id === trackId);

    if (selectedTrack) {
      console.log('[Room] Cambiando a canción seleccionada:', selectedTrack);

      // Actualizar el estado current - PlayerNow se encargará del resto
      setCurrentTrack(selectedTrack);
    }
  };

  // Función para ir a la siguiente canción
  const handleNext = () => {
    if (!queue || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);

    if (currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      console.log('[Room] Saltando a siguiente:', nextTrack);

      // Actualizar el estado current
      setCurrentTrack(nextTrack);
    } else {
      console.log('[Room] Ya estás en la última canción');
    }
  };

  const participantsFromMembers = members.map((m) => ({
    id: m.user_id,
    name: m.username || m.user_id, 
    roles: m.roles,
    canControlPlayback: m.can_control_playback,
    canAddTracks: m.can_add_tracks,
    canInvite: m.can_invite,
  }));

  const participants =
    participantsFromMembers.length > 0
      ? participantsFromMembers
      : room?.participants ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold text-white truncate">
                {room?.name ?? "Sala"}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
                <span>Sala de colaboración musical</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  sincronizada
                </span>
                {!!participants.length && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-200 border border-slate-600">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      className="opacity-80"
                    >
                      <path
                        fill="currentColor"
                        d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m-7 8a7 7 0 0 1 14 0z"
                      />
                    </svg>
                    {participants.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setInviteOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 md:px-6 py-2.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02]"
              >
                Invitar
              </button>
            </div>
          </div>

          {membersError && (
            <p className="mt-2 text-xs text-red-400">
              {membersError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PlayerNow
              track={currentTrack}
              onAddClick={() => setAddOpen(true)}
              onSkipClick={handleNext}
              onPreviousClick={handlePrevious}
              audioRef={audioRef}
              onChangeExternalTrack={changeTrackFromExternalStream}
            />

            <QueueList
              queue={queue}
              currentTrack={currentTrack}
              onAddClick={() => setAddOpen(true)}
              onSkipClick={handleNext}
              onSelectTrack={handleSelectTrack}
            />
          </div>

          <aside className="space-y-6">
            <ParticipantsList participants={participants} />
            <ChatPanel />
          </aside>
        </div>
      </main>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roomId={id} />
      <AddSongDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roomId={id}
        onAddSong={addTrack}
        onChangeExternalTrack={changeTrackFromExternalStream}
      />
    </div>
  );
}



