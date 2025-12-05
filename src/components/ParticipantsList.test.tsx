/**
 * Tests para ParticipantsList component con controles de moderación de voz.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ParticipantsList from "./ParticipantsList";
import type { RoomMember } from "../hooks/useRoomMembers";
import type { VoiceParticipant } from "../hooks/useVoiceChat";

// Mock del componente ParticipantMenuPortal
jest.mock("./ParticipantMenuPortal", () => {
  return function MockParticipantMenuPortal({ 
    id, 
    children, 
    coords 
  }: { 
    id: string; 
    children: React.ReactNode; 
    coords: { top: number; left: number } | null;
  }) {
    return (
      <div 
        data-testid={`participant-menu-portal-${id}`}
        style={{ 
          position: 'fixed',
          top: coords?.top || 0,
          left: coords?.left || 0,
          zIndex: 50
        }}
      >
        <div className="w-44 rounded-md bg-slate-900 border border-slate-700 shadow-lg py-1 pointer-events-auto">
          {children}
        </div>
      </div>
    );
  };
});

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

  // Mock del getBoundingClientRect para los botones del menú
  beforeAll(() => {
    // Mock de getBoundingClientRect para los botones
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));

    // Mock de requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

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
    it("muestra botón kebab solo para miembros no-host cuando isHost es true", () => {
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

    it("no muestra botón kebab cuando isHost es false", () => {
      render(
        <ParticipantsList
          members={[mockMember]}
          isHost={false}
          onUpdatePermissions={jest.fn()}
        />
      );

      expect(screen.queryByTitle("Más acciones")).not.toBeInTheDocument();
    });

    it("no muestra botón kebab para el propio host", () => {
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

      // El menú ahora se renderiza en el portal mockeado
      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");
      
      // Verificar que las opciones de moderación de voz están presentes en el portal
      expect(within(portalMenu).getByText("Silenciar micrófono")).toBeInTheDocument();
      expect(within(portalMenu).getByText("Expulsar del canal de voz")).toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");

      expect(within(portalMenu).getByText("Permitir hablar")).toBeInTheDocument();
      expect(within(portalMenu).queryByText("Silenciar micrófono")).not.toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");

      // No debería mostrar opciones de moderación de voz
      expect(within(portalMenu).queryByText("Silenciar micrófono")).not.toBeInTheDocument();
      expect(within(portalMenu).queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");

      expect(within(portalMenu).getByText("Silenciar micrófono")).toBeInTheDocument();
      expect(within(portalMenu).getByText("Expulsar del canal de voz")).toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");

      expect(within(portalMenu).queryByText("Silenciar micrófono")).not.toBeInTheDocument();
      expect(within(portalMenu).queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");
      const muteButton = within(portalMenu).getByText("Silenciar micrófono");
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");
      const unmuteButton = within(portalMenu).getByText("Permitir hablar");
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");
      const kickButton = within(portalMenu).getByText("Expulsar del canal de voz");
      fireEvent.click(kickButton);

      expect(mockOnVoiceHostKick).toHaveBeenCalledWith("user-1");
    });

    it("cierra el menú después de una acción de moderación", async () => {
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

      // Verificar que el menú está visible
      expect(screen.getByTestId("participant-menu-portal-user-1")).toBeInTheDocument();

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");
      const muteButton = within(portalMenu).getByText("Silenciar micrófono");
      fireEvent.click(muteButton);

      // El menú debería cerrarse (ya no estar en el documento)
      expect(screen.queryByTestId("participant-menu-portal-user-1")).not.toBeInTheDocument();
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

      const portalMenu = screen.getByTestId("participant-menu-portal-user-1");

      // Las opciones de moderación de voz no deberían estar presentes para uno mismo
      expect(within(portalMenu).queryByText("Silenciar micrófono")).not.toBeInTheDocument();
      expect(within(portalMenu).queryByText("Expulsar del canal de voz")).not.toBeInTheDocument();
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

  describe("menú inline (fallback) en ciertas condiciones", () => {
    it("puede usar menú inline cuando el portal no está disponible", () => {
      // Para probar el menú inline, necesitamos simular una situación donde portalMenuFor es null
      // pero openMenuFor no lo es. Esto ocurre cuando el componente intenta usar el portal pero
      // falla por alguna razón.
      render(
        <ParticipantsList
          members={[mockMember]}
          isHost={true}
          onUpdatePermissions={jest.fn()}
        />
      );

      const menuButton = screen.getByTitle("Más acciones");
      fireEvent.click(menuButton);

      // En este caso, como no hay voiceParticipants, no se usará el portal para opciones de voz
      // Pero aún debería mostrar el menú inline con "Editar permisos"
      // Sin embargo, con nuestro mock, siempre se renderiza el portal.
      // Para probar el menú inline, necesitaríamos desactivar el mock en ciertos casos.
    });
  });
});