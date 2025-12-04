"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
} from "react";
import { RoomMember } from "@/hooks/useRoomMembers";
import { MemberPermissionsModal } from "./MemberPermissionsModal";
import type { VoiceParticipant, VoiceRole } from "@/hooks/useVoiceChat";
import ParticipantMenuPortal from "./ParticipantMenuPortal";

type ParticipantsListProps = {
  participants?: Array<{ id: string; name: string; role?: string }>;
  members?: RoomMember[];
  isHost?: boolean;
  onUpdatePermissions?: (
    targetUserId: string,
    permissions: any
  ) => Promise<void>;
  onRemoveMember?: (targetUserId: string, targetName: string) => void;
  voiceParticipants?: VoiceParticipant[];
  selfVoiceRole?: VoiceRole | null;
  onVoiceHostMute?: (targetUserId: string) => void;
  onVoiceHostUnmute?: (targetUserId: string) => void;
  onVoiceHostKick?: (targetUserId: string) => void;
};

function initials(name?: string) {
  const safe = (name ?? "").trim() || "Usuario";
  const parts = safe.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const result = (first + second).toUpperCase();
  return result || "U";
}

const ParticipantsList = React.memo(function ParticipantsList({
  participants = [],
  members = [],
  isHost = false,
  onUpdatePermissions,
  onRemoveMember,
  voiceParticipants = [],
  selfVoiceRole = null,
  onVoiceHostMute,
  onVoiceHostUnmute,
  onVoiceHostKick,
}: ParticipantsListProps) {
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Estado local para controlar menú inline (fallback) y portal
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [portalMenuFor, setPortalMenuFor] = useState<string | null>(null);

  // refs para botones (clave -> HTMLButtonElement)
  const menuButtonRef = useRef<Record<string, HTMLButtonElement | null>>({});

  // coords para posicionar el portal
  const [portalCoords, setPortalCoords] = useState<{ top: number; left: number } | null>(null);

  const getDisplayName = (member: RoomMember) =>
    member.nickname || member.preferred_username || member.username || "Usuario";

  const displayMembers: RoomMember[] =
    members.length > 0
      ? members
      : participants.map((p) => ({
          user_id: p.id,
          room_id: "",
          roles: p.role ? [p.role] : ["member"],
          username: p.name,
          preferred_username: undefined,
          nickname: undefined,
          can_add_tracks: false,
          can_control_playback: false,
          can_invite: false,
          created_at: "",
          updated_at: "",
        }));

  const totalParticipants = displayMembers.length;

  const getVoiceParticipant = (userId: string) =>
    voiceParticipants.find((vp) => vp.userId === userId);

  const canModerateVoice = selfVoiceRole === "host" || selfVoiceRole === "cohost";

  // stable callback generator for ref assignment (good practice)
  const setMenuButtonRef = useCallback(
    (id: string) =>
      (el: HTMLButtonElement | null) => {
        menuButtonRef.current[id] = el;
      },
    []
  );

  // calcula coords del menu portal respecto al botón
  const updatePortalCoords = useCallback((memberId: string | null) => {
    if (!memberId) {
      setPortalCoords(null);
      return;
    }
    const btn = menuButtonRef.current[memberId];
    if (!btn) {
      setPortalCoords(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 176; // w-44 ~ 176px
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    const maxLeft = window.innerWidth - menuWidth - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    const top = rect.bottom + 8;
    setPortalCoords({ top, left });
  }, []);

  useEffect(() => {
    let raf = 0;
    const scheduleUpdate = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => updatePortalCoords(portalMenuFor));
    };

    scheduleUpdate();
    const handler = () => scheduleUpdate();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [portalMenuFor, updatePortalCoords]);

  useEffect(() => {
    if (!portalMenuFor) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      const menuEl = document.getElementById(`participants-portal-menu-${portalMenuFor}`);
      const btn = menuButtonRef.current[portalMenuFor];
      if (menuEl && menuEl.contains(target)) return;
      if (btn && btn.contains(target)) return;
      setPortalMenuFor(null);
      setOpenMenuFor(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [portalMenuFor]);

  // pequeño componente interno: renderiza cada participante
  function ParticipantItem({ member }: { member: RoomMember }) {
    const isHostMember = member.roles?.includes("host");
    const hasAnyPermission =
      member.can_add_tracks || member.can_control_playback || member.can_invite;

    const voiceParticipant = getVoiceParticipant(member.user_id);
    const isInVoice = !!voiceParticipant;
    const isVoiceMuted = voiceParticipant?.muted ?? false;
    const isServerMuted = voiceParticipant?.serverMuted ?? false;

    const onToggleMenu = () => {
      setOpenMenuFor((cur) => (cur === member.user_id ? null : member.user_id));
      setPortalMenuFor((cur) => (cur === member.user_id ? null : member.user_id));
    };

    return (
      <li className="flex items-center gap-3 py-1.5" key={member.user_id}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white border flex-shrink-0 ${
            isInVoice
              ? "bg-gradient-to-br from-purple-500 to-blue-500 border-purple-400/50"
              : "bg-gradient-to-br from-purple-400 to-blue-400 border-slate-700/50"
          }`}
        >
          {initials(getDisplayName(member))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="min-w-0">
              <div className="text-sm text-slate-100 truncate flex items-center gap-1.5">
                {getDisplayName(member)}
                {isInVoice && (
                  <span
                    className={`inline-flex items-center ${
                      isServerMuted
                        ? "text-orange-400"
                        : isVoiceMuted
                        ? "text-slate-400"
                        : "text-emerald-400"
                    }`}
                    title={
                      isServerMuted
                        ? "Silenciado por el host"
                        : isVoiceMuted
                        ? "Micrófono silenciado"
                        : "En el canal de voz"
                    }
                  >
                    {isServerMuted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="14" y="1" width="8" height="6" rx="1" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
                        <line x1="8" y1="5" x2="16" y2="11" strokeWidth={2} />
                      </svg>
                    ) : isVoiceMuted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22M9 9v2a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
                      </svg>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-0.5 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{isHostMember ? "Host" : "Miembro"}</span>

                {!isHostMember && hasAnyPermission && (
                  <div className="flex items-center gap-1">
                    {member.can_add_tracks && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        title="Permiso: puede añadir canciones a la cola de esta sala"
                        aria-label="Permiso para añadir canciones a la cola"
                      />
                    )}
                    {member.can_control_playback && (
                      <span
                        className="w-2 h-2 rounded-full bg-sky-400"
                        title="Permiso: puede pausar, reanudar y cambiar la canción que se reproduce"
                        aria-label="Permiso para controlar la reproducción"
                      />
                    )}
                    {member.can_invite && (
                      <span
                        className="w-2 h-2 rounded-full bg-violet-400"
                        title="Permiso: puede invitar a otras personas a unirse a la sala"
                        aria-label="Permiso para invitar usuarios a la sala"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* botón kebab */}
            {isHost && !isHostMember && (onUpdatePermissions || onRemoveMember || (canModerateVoice && isInVoice)) && (
              <div className="relative flex-shrink-0 mt-1 sm:mt-0">
                <button
                  type="button"
                  ref={setMenuButtonRef(member.user_id)}
                  onClick={onToggleMenu}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/60 border border-slate-600/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                  aria-label="Acciones sobre este participante"
                  title="Más acciones"
                >
                  ⋯
                </button>

                {/* Fallback inline menu (se usa solo si portal no está activo) */}
                {openMenuFor === member.user_id && !portalMenuFor && (
                  <div className="absolute z-50 w-44 rounded-md bg-slate-900 border border-slate-700 shadow-lg py-1 right-0 top-full mt-2 sm:mt-0 sm:top-0 sm:left-full sm:right-auto sm:ml-2 pointer-events-auto">
                    {onUpdatePermissions && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowPermissionsModal(true);
                          setOpenMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 transition-colors"
                      >
                        Editar permisos
                      </button>
                    )}

                    {canModerateVoice && isInVoice && !voiceParticipant?.isSelf && (
                      <Fragment>
                        {onUpdatePermissions && <div className="h-px bg-slate-700 my-1" />}

                        {isServerMuted ? (
                          onVoiceHostUnmute && (
                            <button
                              type="button"
                              onClick={() => {
                                onVoiceHostUnmute(member.user_id);
                                setOpenMenuFor(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-emerald-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                              Permitir hablar
                            </button>
                          )
                        ) : (
                          onVoiceHostMute && (
                            <button
                              type="button"
                              onClick={() => {
                                onVoiceHostMute(member.user_id);
                                setOpenMenuFor(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-orange-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                              Silenciar micrófono
                            </button>
                          )
                        )}

                        {onVoiceHostKick && (
                          <button
                            type="button"
                            onClick={() => {
                              onVoiceHostKick(member.user_id);
                              setOpenMenuFor(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                          >
                            Expulsar del canal de voz
                          </button>
                        )}
                      </Fragment>
                    )}

                    {(onRemoveMember && (canModerateVoice && isInVoice || onUpdatePermissions)) && (
                      <div className="h-px bg-slate-700 my-1" />
                    )}

                    {onRemoveMember && (
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveMember(member.user_id, getDisplayName(member));
                          setOpenMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-300 hover:bg-slate-800 transition-colors"
                      >
                        Eliminar miembro
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-white font-semibold text-sm sm:text-base">Participantes</h4>
        {totalParticipants > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs text-slate-300 bg-slate-900/60 border border-slate-700/70 rounded-full">
            {totalParticipants}
          </span>
        )}
      </div>

      {totalParticipants === 0 ? (
        <div className="text-slate-400 text-sm">Aún no hay participantes.</div>
      ) : (
        <ul className="space-y-3">
          {displayMembers.map((member) => (
            <ParticipantItem key={member.user_id} member={member} />
          ))}
        </ul>
      )}

      {onUpdatePermissions && (
        <MemberPermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          onUpdatePermissions={onUpdatePermissions}
        />
      )}

      {/* Portal render: el menu se renderiza fuera del flujo para evitar stacking-context issues */}
      {portalMenuFor && portalCoords && (
        <ParticipantMenuPortal id={portalMenuFor} coords={portalCoords}>
          {(() => {
            const member = displayMembers.find((m) => m.user_id === portalMenuFor);
            if (!member) return null;
            const voiceParticipant = getVoiceParticipant(member.user_id);
            const isInVoice = !!voiceParticipant;
            const isServerMuted = voiceParticipant?.serverMuted ?? false;

            return (
              <Fragment>
                {onUpdatePermissions && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowPermissionsModal(true);
                      setPortalMenuFor(null);
                      setOpenMenuFor(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 transition-colors"
                  >
                    Editar permisos
                  </button>
                )}

                {canModerateVoice && isInVoice && !voiceParticipant?.isSelf && (
                  <Fragment>
                    {onUpdatePermissions && <div className="h-px bg-slate-700 my-1" />}

                    {isServerMuted ? (
                      onVoiceHostUnmute && (
                        <button
                          type="button"
                          onClick={() => {
                            onVoiceHostUnmute(member.user_id);
                            setPortalMenuFor(null);
                            setOpenMenuFor(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-emerald-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          Permitir hablar
                        </button>
                      )
                    ) : (
                      onVoiceHostMute && (
                        <button
                          type="button"
                          onClick={() => {
                            onVoiceHostMute(member.user_id);
                            setPortalMenuFor(null);
                            setOpenMenuFor(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-orange-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          Silenciar micrófono
                        </button>
                      )
                    )}

                    {onVoiceHostKick && (
                      <button
                        type="button"
                        onClick={() => {
                          onVoiceHostKick(member.user_id);
                          setPortalMenuFor(null);
                          setOpenMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                      >
                        Expulsar del canal de voz
                      </button>
                    )}
                  </Fragment>
                )}

                {(onRemoveMember && (canModerateVoice && isInVoice || onUpdatePermissions)) && (
                  <div className="h-px bg-slate-700 my-1" />
                )}

                {onRemoveMember && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveMember(member.user_id, getDisplayName(member));
                      setPortalMenuFor(null);
                      setOpenMenuFor(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-300 hover:bg-slate-800 transition-colors"
                  >
                    Eliminar miembro
                  </button>
                )}
              </Fragment>
            );
          })()}
        </ParticipantMenuPortal>
      )}
    </div>
  );
});

export default ParticipantsList;




