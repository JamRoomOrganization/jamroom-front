"use client";

import React, {
    useMemo,
    useState,
    useEffect,
    useCallback,
} from "react";
import Header from "@/components/Header";
import PlayerNow from "@/components/PlayerNow";
import QueueList from "@/components/QueueList";
import ChatPanel from "@/components/ChatPanel";
import ParticipantsList from "@/components/ParticipantsList";
import { useRoom } from "@/hooks/useRoom";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import InviteDialog from "@/components/InviteDialog";
import AddSongDialog from "@/components/AddSongDialog";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { useRoomQueue } from "@/hooks/useRoomQueue";
import type { Track } from "@/types";
import { useRoomActions } from "@/hooks/useRoomActions";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";
import { useRoomPlaybackControls } from "@/hooks/useRoomPlaybackControls";
import { RoomLoadingState } from "@/components/RoomLoadingState";
import { RoomErrorState } from "@/components/RoomErrorState";
import { RoomHeader } from "@/components/RoomHeader";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useVoiceMedia } from "@/hooks/useVoiceMedia";
import { useLiveKitVoiceClient } from "@/hooks/useLiveKitVoiceClient";
import { VoiceControls } from "@/components/VoiceControls";

type RemoveMemberConfirmState = {
    isOpen: boolean;
    memberId: string;
    memberName: string;
};

const initialRemoveMemberState: RemoveMemberConfirmState = {
    isOpen: false,
    memberId: "",
    memberName: "",
};

function getSyncStatus(socketStatus: string) {
    if (socketStatus === "connected") {
        return {
            label: "sincronizada",
            dotClass: "bg-emerald-400",
            pulse: true,
        };
    }

    if (socketStatus === "connecting") {
        return {
            label: "reconectando…",
            dotClass: "bg-yellow-400",
            pulse: true,
        };
    }

    if (socketStatus === "authError") {
        return {
            label: "sin permisos de control",
            dotClass: "bg-red-400",
            pulse: false,
        };
    }

    return {
        label: "sin conexión de sync",
        dotClass: "bg-slate-500",
        pulse: false,
    };
}

export default function RoomPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const roomId = params.id;

    const { user, loading: authLoading } = useAuth();
    const {
        success: showSuccessToast,
        error: showErrorToast,
        info: showInfoToast,
    } = useToast();

    // Estado para modales
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [removeMemberConfirm, setRemoveMemberConfirm] =
        useState<RemoveMemberConfirmState>(initialRemoveMemberState);

    // Diálogos secundarios
    const [inviteOpen, setInviteOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    // Estado de acciones de sala
    const [isLeaving, setIsLeaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        room,
        loading: roomLoading,
        error,
        socketStatus,
        changeTrackFromExternalStream,
        audioRef,
        emitPlayPause,
        emitSeek,
        playbackState,
        currentTrackId,
        hasUserInteracted,
        forcePlay,
        socket,
    } = useRoom(roomId);

    // Feature flag para voice chat
    const enableVoice = process.env.NEXT_PUBLIC_ENABLE_VOICE === "true";
    // Feature flag para voice media
    const enableVoiceMedia = process.env.NEXT_PUBLIC_ENABLE_VOICE_MEDIA === "true";

    // Hook de voice chat (usa el socket compartido con useRoom)
    const {
        participants: voiceParticipants,
        joined: voiceJoined,
        muted: voiceMuted,
        joining: voiceJoining,
        error: voiceError,
        voiceError: voiceErrorState,
        joinVoice,
        leaveVoice,
        toggleMute,
        clearError: clearVoiceError,
    } = useVoiceChat(roomId, socket);

    // Hook de voice media para acceso al micrófono
    const {
        localStream: voiceMediaStream,
        mediaEnabled: voiceMediaEnabled,
        permissionState: voiceMediaPermissionState,
        error: voiceMediaError,
        enableMedia: voiceEnableMedia,
        disableMedia: voiceDisableMedia,
    } = useVoiceMedia({ enabledFlag: enableVoiceMedia });

    // Hook de LiveKit voice client para conexión SFU
    const {
        connected: livekitConnected,
        connecting: livekitConnecting,
        reconnecting: livekitReconnecting,
        canPlaybackAudio: livekitCanPlaybackAudio,
        error: livekitError,
        livekitError: livekitErrorState,
        retryConnection: livekitRetryConnection,
        startAudio: livekitStartAudio,
        setMicrophoneEnabled: livekitSetMicrophoneEnabled,
    } = useLiveKitVoiceClient({
        roomId,
        socket,
        joined: voiceJoined,
        mediaStream: voiceMediaStream,
    });

    /**
     * Handler para toggle de mute que orquesta LiveKit + Socket.IO.
     * 
     * El patrón correcto es:
     * 1. Primero, mutear/desmutear el track real en LiveKit (setMicrophoneEnabled)
     * 2. Luego, emitir el estado a Socket.IO para sincronizar UI con otros participantes
     * 
     * Esto garantiza que el audio real se detenga ANTES de actualizar el estado social.
     */
    const handleToggleMute = useCallback(async () => {
        // Calcular el nuevo estado de mute (inverso del actual)
        const newMuted = !voiceMuted;
        
        console.log("[RoomPage] handleToggleMute", { 
            currentMuted: voiceMuted, 
            newMuted,
            livekitConnected,
        });

        // 1. Primero mutear/desmutear en LiveKit (media real)
        // setMicrophoneEnabled(true) = mic activo (no muted)
        // setMicrophoneEnabled(false) = mic silenciado (muted)
        if (livekitConnected) {
            await livekitSetMicrophoneEnabled(!newMuted);
        }

        // 2. Luego emitir estado a Socket.IO (señalización/UI)
        toggleMute();
    }, [voiceMuted, livekitConnected, livekitSetMicrophoneEnabled, toggleMute]);

    const {
        members,
        error: membersError,
        reload: reloadMembers,
        isMember,
        updateMemberPermissions,
    } = useRoomMembers(roomId);

    const { queue, loading: queueLoading, addTrack } = useRoomQueue(roomId);

    const { deleteRoom, leaveRoom, removeMember } = useRoomActions(roomId);

    // Ref para evitar re-ejecutar auto-play del primer track
    const hasAutoPlayedFirstTrackRef = React.useRef(false);
    // Ref para rastrear el último track ID reproducido
    const lastPlayedTrackIdRef = React.useRef<string | null>(null);

    const isHost = members.some(
        (member) =>
            member.user_id === user?.id && member.roles?.includes("host")
    );

    const currentMember = members.find((m) => m.user_id === user?.id);

    const canAddTracks = isHost || !!currentMember?.can_add_tracks;
    const canControlPlayback = isHost || !!currentMember?.can_control_playback;

    // Confirm: abandonar sala
    const handleLeaveRoom = () => {
        setLeaveConfirmOpen(true);
    };

    const handleLeaveConfirm = async () => {
        setIsLeaving(true);
        try {
            await leaveRoom();
            showSuccessToast("Has abandonado la sala.");
        } catch (err) {
            console.error("Error leaving room:", err);
            showErrorToast("Error al abandonar la sala. Inténtalo de nuevo."); 
        } finally {
            setIsLeaving(false);
            setLeaveConfirmOpen(false);
        }
    };

    // Confirm: eliminar sala
    const handleDeleteRoom = () => {
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await deleteRoom();
            showSuccessToast("Sala eliminada correctamente.");
        } catch (err) {
            console.error("Error deleting room:", err);
            showErrorToast("Error al eliminar la sala. Inténtalo de nuevo.");
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    const handleOpenAddDialog = () => {
        if (!canAddTracks) {
            showErrorToast("No tienes permiso para agregar canciones a la cola.");
            return;
        }
        setAddOpen(true);
    };

    // Confirm: eliminar miembro
    const handleRemoveMemberClick = (
        memberId: string,
        memberName: string
    ) => {
        setRemoveMemberConfirm({
            isOpen: true,
            memberId,
            memberName,
        });
    };

    const handleRemoveMemberConfirm = async () => {
        try {
            await removeMember(removeMemberConfirm.memberId);
            await reloadMembers();
            showSuccessToast("Miembro eliminado de la sala.");
        } catch (err) {
            console.error("Error removing member:", err);
            showErrorToast("Error al eliminar miembro. Inténtalo de nuevo.");
        } finally {
            setRemoveMemberConfirm(initialRemoveMemberState);
        }
    };

    // currentTrack derivado de cola + currentTrackId
    const currentTrack: Track | undefined = useMemo(() => {
        if (!queue || queue.length === 0) return undefined;
        if (currentTrackId) {
            const match = queue.find((t) => t.id === currentTrackId);
            if (match) return match;
        }
        return queue[0];
    }, [queue, currentTrackId]);

    const { handlePrevious, handleNext, handleSelectTrack } =
        useRoomPlaybackControls({
            queue,
            currentTrack,
            changeTrackFromExternalStream,
        });

    // Redirección si no hay usuario autenticado
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/login");
        }
    }, [authLoading, user, router]);

    // Si ya no es miembro, expulsar de la sala
    useEffect(() => {
        if (authLoading || !user) return;

        if (isMember === false) {
            showInfoToast("Has sido eliminado de la sala por el host.");
            router.replace("/");
        }
    }, [authLoading, user, isMember, router, showInfoToast]);

    // Auto-play: cuando se añade la primera canción a una cola vacía
    useEffect(() => {
        // Solo ejecutar si:
        // 1. La cola ya cargó (no está loading)
        // 2. Hay exactamente 1 track en la cola
        // 3. No hay track actualmente reproduciéndose
        // 4. No hemos auto-reproducido ya este track
        // 5. El socket está conectado
        if (
            !queueLoading &&
            queue.length === 1 &&
            !currentTrackId &&
            !hasAutoPlayedFirstTrackRef.current &&
            socketStatus === "connected"
        ) {
            const firstTrack = queue[0];
            if (firstTrack.streamUrl && firstTrack.id !== lastPlayedTrackIdRef.current) {
                console.log("[RoomPage] Auto-reproduciendo primer track de la cola:", firstTrack.id);
                hasAutoPlayedFirstTrackRef.current = true;
                lastPlayedTrackIdRef.current = firstTrack.id;
                
                // Pequeño delay para asegurar que el socket esté listo
                setTimeout(() => {
                    changeTrackFromExternalStream({
                        trackId: firstTrack.id,
                        streamUrl: firstTrack.streamUrl!,
                    });
                }, 100);
            }
        }
    }, [queue, queueLoading, currentTrackId, socketStatus, changeTrackFromExternalStream]);

    // Reset del flag de auto-play cuando cambia la sala
    useEffect(() => {
        hasAutoPlayedFirstTrackRef.current = false;
        lastPlayedTrackIdRef.current = null;
    }, [roomId]);

    // Añadir a cola
    const handleAddAndPlay = useCallback(
        async (
            trackId: string,
            metadata?: {
                title?: string;
                artist?: string;
                artworkUrl?: string;
                duration?: number;
            }
        ) => {
            if (!canAddTracks) {
                showErrorToast("No tienes permiso para agregar canciones a la cola.");
                return;
            }

            try {
                await addTrack(trackId, metadata);
                showSuccessToast("Canción agregada a la cola.");
            } catch (err) {
                console.error("[Room] Error al agregar canción:", err);
                showErrorToast("No se pudo agregar la canción. Inténtalo de nuevo.");
            }
        },
        [addTrack, canAddTracks, showErrorToast, showSuccessToast]
    );

    // Adaptador para onChangeExternalTrack del diálogo
    const handleChangeExternalTrack = useCallback(
        (opts: {
            trackId: string;
            streamUrl: string;
            title: string;
            artist?: string;
            artworkUrl?: string;
            source?: "audius" | "other";
        }) => {
            changeTrackFromExternalStream({
                trackId: opts.trackId,
                streamUrl: opts.streamUrl,
            });
        },
        [changeTrackFromExternalStream]
    );

    if (!user && !authLoading) {
        return null;
    }

    const isLoading = roomLoading || authLoading || queueLoading;

    if (isLoading) {
        return <RoomLoadingState />;
    }

    if (error) {
        return (
            <RoomErrorState
                error={error}
                roomId={roomId}
                socketStatus={socketStatus}
                onCreateRoom={() => router.push("/create")}
                onGoHome={() => router.push("/")}
                onRetry={() => window.location.reload()}
                onReLogin={() => router.push("/login")}
            />
        );
    }

    const participantsCount = members.length;

    const {
        label: syncLabel,
        dotClass: syncDotClass,
        pulse: syncPulse,
    } = getSyncStatus(socketStatus);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header de sala */}
                <RoomHeader
                    roomName={room?.name}
                    participantsCount={participantsCount}
                    syncLabel={syncLabel}
                    syncDotClass={syncDotClass}
                    syncPulse={syncPulse}
                    isHost={isHost}
                    isLeaving={isLeaving}
                    isDeleting={isDeleting}
                    onInvite={() => setInviteOpen(true)}
                    onLeave={handleLeaveRoom}
                    onDelete={handleDeleteRoom}
                />

                {/* Modales de confirmación */}
                <ConfirmModal
                    isOpen={leaveConfirmOpen}
                    onClose={() => setLeaveConfirmOpen(false)}
                    onConfirm={handleLeaveConfirm}
                    title="Abandonar sala"
                    message="¿Estás seguro de que quieres abandonar esta sala?"
                    confirmText="Abandonar"
                    type="warning"
                />

                <ConfirmModal
                    isOpen={deleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    title="Eliminar sala"
                    message="¿Estás seguro de que quieres eliminar esta sala? Esta acción no se puede deshacer y todos los participantes serán expulsados."
                    confirmText="Eliminar"
                    type="danger"
                />

                <ConfirmModal
                    isOpen={removeMemberConfirm.isOpen}
                    onClose={() =>
                        setRemoveMemberConfirm(initialRemoveMemberState)
                    }
                    onConfirm={handleRemoveMemberConfirm}
                    title="Eliminar miembro"
                    message={`¿Estás seguro de que quieres eliminar a "${removeMemberConfirm.memberName}" de la sala?`}
                    confirmText="Eliminar"
                    type="danger"
                />

                {membersError && (
                    <p className="mt-2 text-xs text-red-400">{membersError}</p>
                )}

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <PlayerNow
                            track={currentTrack}
                            onAddClick={handleOpenAddDialog}
                            onSkipClick={
                                canControlPlayback ? handleNext : undefined
                            }
                            onPreviousClick={
                                canControlPlayback ? handlePrevious : undefined
                            }
                            audioRef={audioRef}
                            isPlaying={playbackState === "playing"}
                            onPlayPause={
                                canControlPlayback ? emitPlayPause : undefined
                            }
                            onSeek={canControlPlayback ? emitSeek : undefined}
                            hasUserInteracted={hasUserInteracted}
                            forcePlay={forcePlay}
                            canControlPlayback={canControlPlayback}
                        />

                        <QueueList
                            queue={queue}
                            currentTrack={currentTrack}
                            onAddClick={handleOpenAddDialog}
                            onSelectTrack={
                                canControlPlayback ? handleSelectTrack : undefined
                            }
                        />
                    </div>

                    <aside className="space-y-6">
                        <ParticipantsList
                            members={members}
                            isHost={isHost}
                            onUpdatePermissions={updateMemberPermissions}
                            onRemoveMember={handleRemoveMemberClick}
                        />
                        <VoiceControls
                            participants={voiceParticipants}
                            joined={voiceJoined}
                            muted={voiceMuted}
                            joining={voiceJoining}
                            error={voiceError}
                            voiceError={voiceErrorState}
                            onJoin={joinVoice}
                            onLeave={leaveVoice}
                            onToggleMute={handleToggleMute}
                            enableVoice={enableVoice}
                            enableVoiceMedia={enableVoiceMedia}
                            mediaEnabled={voiceMediaEnabled}
                            mediaPermissionState={voiceMediaPermissionState}
                            mediaError={voiceMediaError}
                            onEnableMedia={voiceEnableMedia}
                            onDisableMedia={voiceDisableMedia}
                            livekitConnected={livekitConnected}
                            livekitConnecting={livekitConnecting}
                            livekitReconnecting={livekitReconnecting}
                            livekitCanPlaybackAudio={livekitCanPlaybackAudio}
                            livekitError={livekitError}
                            livekitErrorState={livekitErrorState}
                            onLivekitRetry={livekitRetryConnection}
                            onLivekitStartAudio={livekitStartAudio}
                            onClearError={clearVoiceError}
                        />
                    </aside>
                </div>
            </main>

            <InviteDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                roomId={roomId}
            />

            <AddSongDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onAddSong={handleAddAndPlay}
                onChangeExternalTrack={handleChangeExternalTrack}
            />
        </div>
    );
}
