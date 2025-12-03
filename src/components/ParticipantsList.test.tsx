/**
 * Tests para ParticipantsList component con controles de moderación de voz.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ParticipantsList from "./ParticipantsList";
import type { RoomMember } from "@/hooks/useRoomMembers";
import type { VoiceParticipant } from "@/hooks/useVoiceChat";

describe("ParticipantsList", () => {
    const mockMember: RoomMember = {
        user_id: "user-1",
        room_id: "room-1",
        roles: ["member"],
        username: "testuser",
        preferred_username: undefined,
        nickname: undefined,
        can_add_tracks: false,
        can_control_playback: false,
        can_invite: false,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
    };

    const mockHostMember: RoomMember = {
        ...mockMember,
        user_id: "host-1",
        username: "hostuser",
        roles: ["host"],
    };

    const mockVoiceParticipant: VoiceParticipant = {
        userId: "user-1",
        displayName: "Test User",
        muted: false,
        serverMuted: false,
        role: "speaker",
        isSelf: false,
    };

    describe("renderizado básico", () => {
        it("renderiza mensaje cuando no hay participantes", () => {
            render(<ParticipantsList members={[]} />);

            expect(screen.getByText("Aún no hay participantes.")).toBeInTheDocument();
        });

        it("renderiza lista de participantes", () => {
            render(<ParticipantsList members={[mockMember]} />);

            expect(screen.getByText("testuser")).toBeInTheDocument();
            expect(screen.getByText("Miembro")).toBeInTheDocument();
        });

        it("muestra el contador de participantes", () => {
            render(<ParticipantsList members={[mockMember, mockHostMember]} />);

            expect(screen.getByText("2")).toBeInTheDocument();
        });

        it("muestra 'Host' para miembros con rol host", () => {
            render(<ParticipantsList members={[mockHostMember]} />);

            expect(screen.getByText("Host")).toBeInTheDocument();
        });
    });

    describe("indicadores de estado de voz", () => {
        it("muestra icono de micrófono activo para participantes en voz no silenciados", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    voiceParticipants={[mockVoiceParticipant]}
                />
            );

            expect(screen.getByTitle("En el canal de voz")).toBeInTheDocument();
        });

        it("muestra icono de micrófono silenciado para participantes auto-silenciados", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    voiceParticipants={[{ ...mockVoiceParticipant, muted: true }]}
                />
            );

            expect(screen.getByTitle("Micrófono silenciado")).toBeInTheDocument();
        });

        it("muestra icono especial para participantes silenciados por el servidor", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    voiceParticipants={[{ ...mockVoiceParticipant, serverMuted: true }]}
                />
            );

            expect(screen.getByTitle("Silenciado por el host")).toBeInTheDocument();
        });

        it("no muestra icono de voz para participantes que no están en el canal", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    voiceParticipants={[]}
                />
            );

            expect(screen.queryByTitle("En el canal de voz")).not.toBeInTheDocument();
            expect(screen.queryByTitle("Micrófono silenciado")).not.toBeInTheDocument();
            expect(screen.queryByTitle("Silenciado por el host")).not.toBeInTheDocument();
        });
    });

    describe("menú de acciones para host", () => {
        it("muestra menú kebab solo para el host", () => {
            render(
                <ParticipantsList
                    members={[mockHostMember, mockMember]}
                    isHost={true}
                    onUpdatePermissions={jest.fn()}
                />
            );

            // Debe haber solo un botón de menú (para el miembro, no para el host)
            const menuButtons = screen.getAllByTitle("Más acciones");
            expect(menuButtons).toHaveLength(1);
        });

        it("no muestra menú kebab cuando isHost es false", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={false}
                    onUpdatePermissions={jest.fn()}
                />
            );

            expect(screen.queryByTitle("Más acciones")).not.toBeInTheDocument();
        });

        it("no muestra menú kebab para el propio host", () => {
            render(
                <ParticipantsList
                    members={[mockHostMember]}
                    isHost={true}
                    onUpdatePermissions={jest.fn()}
                />
            );

            expect(screen.queryByTitle("Más acciones")).not.toBeInTheDocument();
        });
    });

    describe("controles de moderación de voz (visibilidad)", () => {
        const mockOnVoiceHostMute = jest.fn();
        const mockOnVoiceHostUnmute = jest.fn();
        const mockOnVoiceHostKick = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("muestra controles de moderación de voz para host cuando el participante está en voz", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="host"
                    onVoiceHostMute={mockOnVoiceHostMute}
                    onVoiceHostUnmute={mockOnVoiceHostUnmute}
                    onVoiceHostKick={mockOnVoiceHostKick}
                />
            );

            // Abrir el menú
            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            // Verificar que las opciones de moderación de voz están presentes
            expect(screen.getByText("Silenciar micrófono")).toBeInTheDocument();
            expect(screen.getByText("Expulsar del canal de voz")).toBeInTheDocument();
        });

        it("muestra 'Permitir hablar' cuando el participante está serverMuted", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[{ ...mockVoiceParticipant, serverMuted: true }]}
                    selfVoiceRole="host"
                    onVoiceHostMute={mockOnVoiceHostMute}
                    onVoiceHostUnmute={mockOnVoiceHostUnmute}
                    onVoiceHostKick={mockOnVoiceHostKick}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            expect(screen.getByText("Permitir hablar")).toBeInTheDocument();
            expect(screen.queryByText("Silenciar micrófono")).not.toBeInTheDocument();
        });

        it("no muestra controles de moderación de voz para usuarios no host/cohost", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="speaker"
                    onUpdatePermissions={jest.fn()}
                    onVoiceHostMute={mockOnVoiceHostMute}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            // No debería mostrar opciones de moderación de voz
            expect(screen.queryByText("Silenciar micrófono")).not.toBeInTheDocument();
            expect(screen.queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
        });

        it("muestra controles de moderación de voz para cohost", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="cohost"
                    onVoiceHostMute={mockOnVoiceHostMute}
                    onVoiceHostKick={mockOnVoiceHostKick}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            expect(screen.getByText("Silenciar micrófono")).toBeInTheDocument();
            expect(screen.getByText("Expulsar del canal de voz")).toBeInTheDocument();
        });

        it("no muestra controles de voz cuando el participante no está en el canal de voz", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[]}
                    selfVoiceRole="host"
                    onUpdatePermissions={jest.fn()}
                    onVoiceHostMute={mockOnVoiceHostMute}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            expect(screen.queryByText("Silenciar micrófono")).not.toBeInTheDocument();
            expect(screen.queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
        });
    });

    describe("acciones de moderación de voz", () => {
        const mockOnVoiceHostMute = jest.fn();
        const mockOnVoiceHostUnmute = jest.fn();
        const mockOnVoiceHostKick = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("llama a onVoiceHostMute al hacer clic en 'Silenciar micrófono'", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="host"
                    onVoiceHostMute={mockOnVoiceHostMute}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            const muteButton = screen.getByText("Silenciar micrófono");
            fireEvent.click(muteButton);

            expect(mockOnVoiceHostMute).toHaveBeenCalledWith("user-1");
        });

        it("llama a onVoiceHostUnmute al hacer clic en 'Permitir hablar'", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[{ ...mockVoiceParticipant, serverMuted: true }]}
                    selfVoiceRole="host"
                    onVoiceHostUnmute={mockOnVoiceHostUnmute}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            const unmuteButton = screen.getByText("Permitir hablar");
            fireEvent.click(unmuteButton);

            expect(mockOnVoiceHostUnmute).toHaveBeenCalledWith("user-1");
        });

        it("llama a onVoiceHostKick al hacer clic en 'Expulsar del canal de voz'", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="host"
                    onVoiceHostKick={mockOnVoiceHostKick}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            const kickButton = screen.getByText("Expulsar del canal de voz");
            fireEvent.click(kickButton);

            expect(mockOnVoiceHostKick).toHaveBeenCalledWith("user-1");
        });

        it("cierra el menú después de una acción de moderación", () => {
            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[mockVoiceParticipant]}
                    selfVoiceRole="host"
                    onVoiceHostMute={mockOnVoiceHostMute}
                />
            );

            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            const muteButton = screen.getByText("Silenciar micrófono");
            fireEvent.click(muteButton);

            // El menú debería cerrarse
            expect(screen.queryByText("Silenciar micrófono")).not.toBeInTheDocument();
        });
    });

    describe("no muestra opciones de voz para el propio usuario", () => {
        it("no muestra controles de moderación para el propio usuario en voz", () => {
            const selfVoiceParticipant: VoiceParticipant = {
                ...mockVoiceParticipant,
                isSelf: true,
            };

            render(
                <ParticipantsList
                    members={[mockMember]}
                    isHost={true}
                    voiceParticipants={[selfVoiceParticipant]}
                    selfVoiceRole="host"
                    onVoiceHostMute={jest.fn()}
                    onVoiceHostKick={jest.fn()}
                />
            );

            // Abrir el menú
            const menuButton = screen.getByTitle("Más acciones");
            fireEvent.click(menuButton);

            // Las opciones de moderación de voz no deberían estar presentes para uno mismo
            expect(screen.queryByText("Silenciar micrófono")).not.toBeInTheDocument();
            expect(screen.queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
        });
    });

    describe("indicadores de permisos", () => {
        it("muestra indicadores de permisos para miembros con permisos", () => {
            const memberWithPermissions: RoomMember = {
                ...mockMember,
                can_add_tracks: true,
                can_control_playback: true,
                can_invite: true,
            };

            render(<ParticipantsList members={[memberWithPermissions]} />);

            expect(screen.getByTitle("Permiso: puede añadir canciones a la cola de esta sala")).toBeInTheDocument();
            expect(screen.getByTitle("Permiso: puede pausar, reanudar y cambiar la canción que se reproduce")).toBeInTheDocument();
            expect(screen.getByTitle("Permiso: puede invitar a otras personas a unirse a la sala")).toBeInTheDocument();
        });

        it("no muestra indicadores de permisos para hosts", () => {
            const hostWithPermissions: RoomMember = {
                ...mockHostMember,
                can_add_tracks: true,
                can_control_playback: true,
            };

            render(<ParticipantsList members={[hostWithPermissions]} />);

            // Los indicadores de permisos no se muestran para el host
            expect(screen.queryByTitle("Permiso: puede añadir canciones a la cola de esta sala")).not.toBeInTheDocument();
        });
    });
});
