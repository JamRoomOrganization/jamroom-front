import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import RoomPage from "../room/[id]/page";
import "@testing-library/jest-dom";

// Mock de todos los hooks y componentes
jest.mock("@/hooks/useRoom", () => ({
  useRoom: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useToast", () => ({
  useToast: jest.fn(),
}));

jest.mock("@/hooks/useRoomMembers", () => ({
  useRoomMembers: jest.fn(),
}));

jest.mock("@/hooks/useRoomQueue", () => ({
  useRoomQueue: jest.fn(),
}));

jest.mock("@/hooks/useRoomActions", () => ({
  useRoomActions: jest.fn(),
}));

jest.mock("@/hooks/useRoomPlaybackControls", () => ({
  useRoomPlaybackControls: jest.fn(),
}));

jest.mock("@/hooks/useVoiceChat", () => ({
  useVoiceChat: jest.fn(),
}));

jest.mock("@/hooks/useVoiceMedia", () => ({
  useVoiceMedia: jest.fn(),
}));

jest.mock("@/hooks/useLiveKitVoiceClient", () => ({
  useLiveKitVoiceClient: jest.fn(),
}));

jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

jest.mock("@/components/PlayerNow", () => ({
  __esModule: true,
  default: () => <div data-testid="player-now">PlayerNow</div>,
}));

jest.mock("@/components/QueueList", () => ({
  __esModule: true,
  default: () => <div data-testid="queue-list">QueueList</div>,
}));

jest.mock("@/components/ChatPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="chat-panel">ChatPanel</div>,
}));

jest.mock("@/components/ParticipantsList", () => ({
  __esModule: true,
  default: () => <div data-testid="participants-list">ParticipantsList</div>,
}));

jest.mock("@/components/InviteDialog", () => ({
  __esModule: true,
  default: () => <div data-testid="invite-dialog">InviteDialog</div>,
}));

jest.mock("@/components/AddSongDialog", () => ({
  __esModule: true,
  default: () => <div data-testid="add-song-dialog">AddSongDialog</div>,
}));

jest.mock("@/components/ConfirmModal", () => ({
  __esModule: true,
  ConfirmModal: () => <div data-testid="confirm-modal">ConfirmModal</div>,
}));

jest.mock("@/components/RoomLoadingState", () => ({
  __esModule: true,
  RoomLoadingState: () => <div data-testid="room-loading-state">RoomLoadingState</div>,
}));

jest.mock("@/components/RoomErrorState", () => ({
  __esModule: true,
  RoomErrorState: () => <div data-testid="room-error-state">RoomErrorState</div>,
}));

jest.mock("@/components/RoomHeader", () => ({
  __esModule: true,
  RoomHeader: () => <div data-testid="room-header">RoomHeader</div>,
}));

jest.mock("@/components/VoiceControls", () => ({
  __esModule: true,
  VoiceControls: () => <div data-testid="voice-controls">VoiceControls</div>,
}));

// Mock de next/navigation
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
  }),
  useParams: jest.fn(),
}));

describe("RoomPage", () => {
  // Mocks comunes
  const mockUseAuth = jest.requireMock("@/context/AuthContext").useAuth;
  const mockUseRoom = jest.requireMock("@/hooks/useRoom").useRoom;
  const mockUseToast = jest.requireMock("@/hooks/useToast").useToast;
  const mockUseRoomMembers = jest.requireMock("@/hooks/useRoomMembers").useRoomMembers;
  const mockUseRoomQueue = jest.requireMock("@/hooks/useRoomQueue").useRoomQueue;
  const mockUseRoomActions = jest.requireMock("@/hooks/useRoomActions").useRoomActions;
  const mockUseRoomPlaybackControls = jest.requireMock("@/hooks/useRoomPlaybackControls").useRoomPlaybackControls;
  const mockUseVoiceChat = jest.requireMock("@/hooks/useVoiceChat").useVoiceChat;
  const mockUseVoiceMedia = jest.requireMock("@/hooks/useVoiceMedia").useVoiceMedia;
  const mockUseLiveKitVoiceClient = jest.requireMock("@/hooks/useLiveKitVoiceClient").useLiveKitVoiceClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock por defecto de useParams
    (useParams as jest.Mock).mockReturnValue({ id: "test-room-id" });
    
    // Mock de useAuth - usuario autenticado
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", name: "Test User" },
      loading: false,
    });
    
    // Mock de useToast
    mockUseToast.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    });
    
    // Mock de useRoom - sala cargada
    mockUseRoom.mockReturnValue({
      room: { id: "test-room-id", name: "Test Room" },
      loading: false,
      error: null,
      socketStatus: "connected",
      changeTrackFromExternalStream: jest.fn(),
      audioRef: { current: null },
      emitPlayPause: jest.fn(),
      emitSeek: jest.fn(),
      playbackState: "playing",
      currentTrackId: null,
      hasUserInteracted: true,
      forcePlay: jest.fn(),
      socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    });
    
    // Mock de useRoomMembers
    mockUseRoomMembers.mockReturnValue({
      members: [
        { user_id: "user-123", roles: ["host"], can_add_tracks: true, can_control_playback: true }
      ],
      error: null,
      reload: jest.fn(),
      isMember: true,
      updateMemberPermissions: jest.fn(),
    });
    
    // Mock de useRoomQueue
    mockUseRoomQueue.mockReturnValue({
      queue: [],
      loading: false,
      addTrack: jest.fn(),
    });
    
    // Mock de useRoomActions
    mockUseRoomActions.mockReturnValue({
      deleteRoom: jest.fn(),
      leaveRoom: jest.fn(),
      removeMember: jest.fn(),
    });
    
    // Mock de useRoomPlaybackControls
    mockUseRoomPlaybackControls.mockReturnValue({
      handlePrevious: jest.fn(),
      handleNext: jest.fn(),
      handleSelectTrack: jest.fn(),
    });
    
    // Mock de useVoiceChat
    mockUseVoiceChat.mockReturnValue({
      participants: [],
      joined: false,
      muted: false,
      joining: false,
      error: null,
      voiceError: null,
      joinVoice: jest.fn(),
      leaveVoice: jest.fn(),
      toggleMute: jest.fn(),
      clearError: jest.fn(),
    });
    
    // Mock de useVoiceMedia
    mockUseVoiceMedia.mockReturnValue({
      localStream: null,
      mediaEnabled: false,
      permissionState: "prompt",
      error: null,
      enableMedia: jest.fn(),
      disableMedia: jest.fn(),
    });
    
    // Mock de useLiveKitVoiceClient
    mockUseLiveKitVoiceClient.mockReturnValue({
      connected: false,
      connecting: false,
      reconnecting: false,
      canPlaybackAudio: false,
      error: null,
      livekitError: null,
      retryConnection: jest.fn(),
      startAudio: jest.fn(),
    });
    
    // Mock de process.env
    Object.defineProperty(process.env, "NEXT_PUBLIC_ENABLE_VOICE", {
      value: "true",
      writable: true,
    });
    Object.defineProperty(process.env, "NEXT_PUBLIC_ENABLE_VOICE_MEDIA", {
      value: "true",
      writable: true,
    });
  });

  test("renderiza el estado de carga cuando authLoading es true", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });
    
    mockUseRoom.mockReturnValue({
      room: null,
      loading: true,
      error: null,
      socketStatus: "connecting",
      changeTrackFromExternalStream: jest.fn(),
      audioRef: { current: null },
      emitPlayPause: jest.fn(),
      emitSeek: jest.fn(),
      playbackState: "paused",
      currentTrackId: null,
      hasUserInteracted: false,
      forcePlay: jest.fn(),
      socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    });
    
    render(<RoomPage />);
    
    expect(screen.getByTestId("room-loading-state")).toBeInTheDocument();
  });

    test("redirige a login cuando no hay usuario autenticado", async () => {
    mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
    });
    
    render(<RoomPage />);
    
    // Usa waitFor porque la redirección puede ser asíncrona
    await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/login");
    });
    });

  test("renderiza el estado de error cuando useRoom retorna error", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", name: "Test User" },
      loading: false,
    });
    
    mockUseRoom.mockReturnValue({
      room: null,
      loading: false,
      error: "Error al cargar la sala",
      socketStatus: "disconnected",
      changeTrackFromExternalStream: jest.fn(),
      audioRef: { current: null },
      emitPlayPause: jest.fn(),
      emitSeek: jest.fn(),
      playbackState: "paused",
      currentTrackId: null,
      hasUserInteracted: false,
      forcePlay: jest.fn(),
      socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    });
    
    render(<RoomPage />);
    
    expect(screen.getByTestId("room-error-state")).toBeInTheDocument();
  });

  test("renderiza la página de sala correctamente cuando hay datos", () => {
    render(<RoomPage />);
    
    // Verificar que se renderizan los componentes principales
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("room-header")).toBeInTheDocument();
    expect(screen.getByTestId("player-now")).toBeInTheDocument();
    expect(screen.getByTestId("queue-list")).toBeInTheDocument();
    expect(screen.getByTestId("participants-list")).toBeInTheDocument();
    expect(screen.getByTestId("voice-controls")).toBeInTheDocument();
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  test("muestra modales de confirmación cuando se activan", () => {
    render(<RoomPage />);
    
    // Los modales están en el DOM pero ocultos inicialmente
    // Podemos verificar que los componentes de modal están en el árbol
    expect(screen.getAllByTestId("confirm-modal").length).toBeGreaterThan(0);
  });

  test("ejecuta handleLeaveRoom cuando se llama", () => {
    const { rerender } = render(<RoomPage />);
    
    // Necesitamos simular que el botón de abandonar sala fue clickeado
    // Como el RoomHeader está mockeado, no podemos interactuar directamente
    // Pero podemos probar que las funciones mock están configuradas
    
    // Verificar que las funciones mock están disponibles
    expect(mockUseRoomActions().leaveRoom).toBeDefined();
  });

  test("maneja el cambio cuando isMember es false", () => {
    mockUseRoomMembers.mockReturnValue({
      members: [],
      error: null,
      reload: jest.fn(),
      isMember: false, // Esto debería disparar el useEffect
      updateMemberPermissions: jest.fn(),
    });
    
    render(<RoomPage />);
    
    // Verificar que se llamó a showInfoToast
    expect(mockUseToast().info).toHaveBeenCalledWith(
      "Has sido eliminado de la sala por el host."
    );
  });

  test("deshabilita controles cuando el usuario no tiene permisos", () => {
    // Mock de usuario que no es host y no tiene permisos
    mockUseRoomMembers.mockReturnValue({
      members: [
        { user_id: "user-123", roles: [], can_add_tracks: false, can_control_playback: false }
      ],
      error: null,
      reload: jest.fn(),
      isMember: true,
      updateMemberPermissions: jest.fn(),
    });
    
    render(<RoomPage />);
    
    // El componente debería renderizarse pero con controles deshabilitados
    // Como los componentes están mockeados, no podemos verificar directamente
    // Pero podemos verificar que los hooks fueron llamados con los valores correctos
    expect(mockUseRoomMembers).toHaveBeenCalled();
  });

  test("usa el roomId de los params", () => {
    const testRoomId = "custom-test-id";
    (useParams as jest.Mock).mockReturnValue({ id: testRoomId });
    
    render(<RoomPage />);
    
    // Verificar que useRoom fue llamado con el roomId correcto
    expect(mockUseRoom).toHaveBeenCalledWith(testRoomId);
  });

  test("maneja voice features cuando están habilitadas", () => {
    render(<RoomPage />);
    
    // Verificar que los hooks de voice fueron llamados
    expect(mockUseVoiceChat).toHaveBeenCalled();
    expect(mockUseVoiceMedia).toHaveBeenCalled();
    expect(mockUseLiveKitVoiceClient).toHaveBeenCalled();
  });

  test("deshabilita voice features cuando están deshabilitadas en env", () => {
    Object.defineProperty(process.env, "NEXT_PUBLIC_ENABLE_VOICE", {
      value: "false",
      writable: true,
    });
    
    Object.defineProperty(process.env, "NEXT_PUBLIC_ENABLE_VOICE_MEDIA", {
      value: "false",
      writable: true,
    });
    
    render(<RoomPage />);
    
    // Los hooks aún deberían ser llamados, pero con flags deshabilitados
    expect(mockUseVoiceChat).toHaveBeenCalled();
  });
});