"use client";

import { useState, useEffect } from "react";
import { RoomMember } from "@/hooks/useRoomMembers";

interface MemberPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: RoomMember | null;
  onUpdatePermissions: (userId: string, permissions: any) => Promise<void>;
}

export function MemberPermissionsModal({
  isOpen,
  onClose,
  member,
  onUpdatePermissions,
}: MemberPermissionsModalProps) {
  const [permissions, setPermissions] = useState({
    canAddTracks: false,
    canControlPlayback: false,
    canInvite: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setPermissions({
        canAddTracks: member.can_add_tracks,
        canControlPlayback: member.can_control_playback,
        canInvite: member.can_invite,
      });
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdatePermissions(member.user_id, permissions);
      onClose();
    } catch (error) {
      console.error("Error updating permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    return member.nickname || member.preferred_username || member.username || 'Usuario';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          Permisos de {getDisplayName()}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Permiso: Agregar tracks */}
          <div className="flex items-center justify-between">
            <label className="text-slate-200">Puede agregar canciones</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={permissions.canAddTracks}
                onChange={(e) => setPermissions(prev => ({
                  ...prev,
                  canAddTracks: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          {/* Permiso: Controlar reproducción */}
          <div className="flex items-center justify-between">
            <label className="text-slate-200">Puede controlar reproducción</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={permissions.canControlPlayback}
                onChange={(e) => setPermissions(prev => ({
                  ...prev,
                  canControlPlayback: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          {/* Permiso: Invitar */}
          <div className="flex items-center justify-between">
            <label className="text-slate-200">Puede invitar usuarios</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={permissions.canInvite}
                onChange={(e) => setPermissions(prev => ({
                  ...prev,
                  canInvite: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}