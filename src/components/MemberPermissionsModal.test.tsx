import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberPermissionsModal } from './MemberPermissionsModal';
import type { RoomMember } from '../hooks/useRoomMembers';

describe('MemberPermissionsModal', () => {
  const mockMember: RoomMember = {
    user_id: 'user-1',
    room_id: 'room-1',
    roles: ['member'],
    username: 'testuser',
    preferred_username: undefined,
    nickname: undefined,
    can_add_tracks: false,
    can_control_playback: false,
    can_invite: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockOnUpdatePermissions = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no se renderiza cuando isOpen es false', () => {
    render(
      <MemberPermissionsModal
        isOpen={false}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.queryByText('Permisos de')).not.toBeInTheDocument();
  });

  it('no se renderiza cuando member es null', () => {
    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={null}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.queryByText('Permisos de')).not.toBeInTheDocument();
  });

  it('se renderiza correctamente cuando isOpen es true y member existe', () => {
    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Permisos de testuser')).toBeInTheDocument();
    expect(screen.getByText('Puede agregar canciones')).toBeInTheDocument();
    expect(screen.getByText('Puede controlar reproducción')).toBeInTheDocument();
    expect(screen.getByText('Puede invitar usuarios')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('muestra los permisos actuales del miembro correctamente', () => {
    const memberWithPermissions: RoomMember = {
      ...mockMember,
      can_add_tracks: true,
      can_control_playback: false,
      can_invite: true,
    };

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={memberWithPermissions}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // can_add_tracks
    expect(checkboxes[1]).not.toBeChecked(); // can_control_playback
    expect(checkboxes[2]).toBeChecked(); // can_invite
  });

  it('actualiza los permisos cuando se cambian los checkboxes', async () => {
    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    // Activar todos los permisos
    await userEvent.click(checkboxes[0]); // can_add_tracks
    await userEvent.click(checkboxes[1]); // can_control_playback
    await userEvent.click(checkboxes[2]); // can_invite

    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  it('llama a onUpdatePermissions con los permisos correctos al enviar', async () => {
    mockOnUpdatePermissions.mockResolvedValue(undefined);

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]); // Activar can_add_tracks

    const saveButton = screen.getByText('Guardar');
    await userEvent.click(saveButton);

    expect(mockOnUpdatePermissions).toHaveBeenCalledWith('user-1', {
      canAddTracks: true,
      canControlPlayback: false,
      canInvite: false,
    });
  });

  it('llama a onClose después de una actualización exitosa', async () => {
    mockOnUpdatePermissions.mockResolvedValue(undefined);

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const saveButton = screen.getByText('Guardar');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('muestra estado de carga durante la actualización', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnUpdatePermissions.mockReturnValue(promise);

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const saveButton = screen.getByText('Guardar');
    await userEvent.click(saveButton);

    // Debería mostrar "Guardando..."
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByText('Guardando...')).toBeDisabled();

    // Resolver la promesa
    resolvePromise!();
    await waitFor(() => {
      expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
    });
  });

  it('maneja errores durante la actualización', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOnUpdatePermissions.mockRejectedValue(new Error('Network error'));

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const saveButton = screen.getByText('Guardar');
    await userEvent.click(saveButton);

    // El error debería ser capturado y logueado
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating permissions:',
        expect.any(Error)
      );
    });

    // El modal no debería cerrarse
    expect(mockOnClose).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('llama a onClose al hacer clic en Cancelar', async () => {
    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('usa nickname si está disponible', () => {
    const memberWithNickname: RoomMember = {
      ...mockMember,
      nickname: 'MiNickname',
    };

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={memberWithNickname}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Permisos de MiNickname')).toBeInTheDocument();
  });

  it('usa preferred_username si nickname no está disponible', () => {
    const memberWithPreferred: RoomMember = {
      ...mockMember,
      preferred_username: 'preferred_user',
    };

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={memberWithPreferred}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Permisos de preferred_user')).toBeInTheDocument();
  });

  it('usa username si no hay nickname ni preferred_username', () => {
    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Permisos de testuser')).toBeInTheDocument();
  });

  it('usa "Usuario" si no hay ningún nombre disponible', () => {
    const memberWithoutName: RoomMember = {
      ...mockMember,
      username: '',
    };

    render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={memberWithoutName}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Permisos de Usuario')).toBeInTheDocument();
  });

  it('resetea los permisos cuando cambia el member', async () => {
    const { rerender } = render(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={mockMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    // Cambiar a un nuevo miembro con diferentes permisos
    const newMember: RoomMember = {
      ...mockMember,
      user_id: 'user-2',
      can_add_tracks: true,
      can_control_playback: true,
      can_invite: false,
    };

    rerender(
      <MemberPermissionsModal
        isOpen={true}
        onClose={mockOnClose}
        member={newMember}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes[0]).toBeChecked();
    expect(updatedCheckboxes[1]).toBeChecked();
    expect(updatedCheckboxes[2]).not.toBeChecked();
  });
});