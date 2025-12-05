import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomHeader } from './RoomHeader';

describe('RoomHeader', () => {
  const mockRoomName = 'Mi Sala de Música';
  const mockParticipantsCount = 5;
  const mockSyncLabel = 'Conectado';
  const mockSyncDotClass = 'bg-emerald-400';
  const mockSyncPulse = false;
  const mockOnInvite = jest.fn();
  const mockOnLeave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el nombre de la sala', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Mi Sala de Música')).toBeInTheDocument();
  });

  it('muestra "Sala" cuando no hay nombre', () => {
    render(
      <RoomHeader
        roomName={null}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Sala')).toBeInTheDocument();
  });

  it('muestra el contador de participantes', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('muestra el estado de sincronización', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(mockSyncLabel)).toBeInTheDocument();
  });

  it('llama a onInvite cuando se hace clic en Invitar', async () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    const inviteButton = screen.getByText('Invitar');
    await userEvent.click(inviteButton);

    expect(mockOnInvite).toHaveBeenCalled();
  });

  it('llama a onLeave cuando se hace clic en Abandonar', async () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    const leaveButton = screen.getByText('Abandonar');
    await userEvent.click(leaveButton);

    expect(mockOnLeave).toHaveBeenCalled();
  });

  it('muestra botón Eliminar cuando isHost es true', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={true}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('no muestra botón Eliminar cuando isHost es false', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('llama a onDelete cuando se hace clic en Eliminar', async () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={true}
        isLeaving={false}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText('Eliminar');
    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('muestra "Saliendo..." cuando isLeaving es true', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={true}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Saliendo...')).toBeInTheDocument();
  });

  it('muestra "Eliminando..." cuando isDeleting es true', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={true}
        isLeaving={false}
        isDeleting={true}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
  });

  it('deshabilita botón Abandonar cuando isLeaving es true', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={false}
        isLeaving={true}
        isDeleting={false}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    const leaveButton = screen.getByText('Saliendo...');
    expect(leaveButton).toBeDisabled();
  });

  it('deshabilita botón Eliminar cuando isDeleting es true', () => {
    render(
      <RoomHeader
        roomName={mockRoomName}
        participantsCount={mockParticipantsCount}
        syncLabel={mockSyncLabel}
        syncDotClass={mockSyncDotClass}
        syncPulse={mockSyncPulse}
        isHost={true}
        isLeaving={false}
        isDeleting={true}
        onInvite={mockOnInvite}
        onLeave={mockOnLeave}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText('Eliminando...');
    expect(deleteButton).toBeDisabled();
  });
});