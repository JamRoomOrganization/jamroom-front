"use client";

import React from "react";
import Header from "../../../components/Header";
import PlayerNow from "../../../components/PlayerNow";
import QueueList from "../../../components/QueueList";
import ChatPanel from "../../../components/ChatPanel";
import ParticipantsList from "../../../components/ParticipantsList";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import InviteDialog from "../../../components/InviteDialog";
import AddSongDialog from "../../../components/AddSongDialog";
import { useRoomMembers } from "../../../hooks/useRoomMembers";
import { useRoomQueue } from "../../../hooks/useRoomQueue";
import { useRoom } from "../../../hooks/useRoom";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function RoomPage({ params }: PageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { id } = React.use(params);

  // Usamos useRoom para obtener los datos de la sala
  const { room, loading: roomLoading } = useRoom(id);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useRoomMembers(id);

  const {
    queue,
    loading: queueLoading,
    error: queueError,
    addTrack,
    skipTrack, 
  } = useRoomQueue(id);  

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (!user && !authLoading) return null;

  if (roomLoading || authLoading || queueLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando sala…</p>
        </div>
      </div>
    );
  }

  const current = queue?.[0];

  const participantsFromMembers = members.map((m) => ({
    id: m.user_id,
    name: m.user_id, 
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
              track={current}
              onAddClick={() => setAddOpen(true)} 
              onSkipClick={skipTrack} 
            />

            <QueueList
              queue={queue}
              onAddClick={() => setAddOpen(true)} 
               onSkipClick={skipTrack}  
            />
          </div>

          <aside className="space-y-6">
            <ParticipantsList participants={participants} />
            <ChatPanel />
          </aside>
        </div>
      </main>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roomId={id} />
      <AddSongDialog open={addOpen} onOpenChange={setAddOpen} roomId={id} onAddSong={addTrack} /> 
    </div>
  );
}



