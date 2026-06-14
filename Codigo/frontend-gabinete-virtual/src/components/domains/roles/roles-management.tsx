import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import {
  createRole,
  listPermissions,
  listRoles,
  removeRole,
  toApiError,
  updateRole,
} from "../../../lib/role-api";
import { hasPermission, PERMISSION_CODES } from "../../../lib/permission-codes";
import type { PermissionType } from "../../../types/permission/permission-type";
import type { RoleType } from "../../../types/role/role-type";
import { Card } from "../../core";
import { RolesCreateModal, type RoleFormState } from "./roles-create-modal";
import { RolesListSection } from "./roles-list-section";

const EMPTY_FORM: RoleFormState = {
  name: "",
  description: "",
  permissionIds: [],
};

export function RolesManagement() {
  const perPage = 10;
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasForbiddenAccess, setHasForbiddenAccess] = useState(false);
  const [hasInvalidSession, setHasInvalidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const token = getStoredToken();

      if (!token) {
        setHasInvalidSession(true);
        setIsLoading(false);
        return;
      }

      try {
        const authenticatedUser = await getAuthenticatedUserByToken(token);

        if (!authenticatedUser) {
          setHasInvalidSession(true);
          return;
        }

        setPermissionCodes(authenticatedUser.permissions);

        if (!hasPermission(authenticatedUser.permissions, PERMISSION_CODES.ROLES_VIEW)) {
          setHasForbiddenAccess(true);
          return;
        }

        const canMutateRoles =
          hasPermission(authenticatedUser.permissions, PERMISSION_CODES.ROLES_CREATE) ||
          hasPermission(authenticatedUser.permissions, PERMISSION_CODES.ROLES_UPDATE);

        const [rolesResponse, permissionsResponse] = await Promise.all([
          listRoles(1, perPage),
          canMutateRoles ? listPermissions() : Promise.resolve([]),
        ]);

        setRoles(rolesResponse.data);
        setCurrentPage(rolesResponse.meta.current_page);
        setLastPage(rolesResponse.meta.last_page);
        setTotalRoles(rolesResponse.meta.total);
        setPermissions(permissionsResponse);
      } catch (requestError) {
        setError(toApiError(requestError, "Nao foi possivel carregar os papeis."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const canCreateRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_CREATE);
  const canUpdateRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_UPDATE);
  const canDeleteRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_DELETE);

  const selectedPermissions = useMemo(
    () => permissions.filter((permission) => form.permissionIds.includes(permission.id)),
    [form.permissionIds, permissions],
  );

  function handleSelectRole(role: RoleType) {
    if (!canUpdateRoles) {
      setError("Voce nao tem permissao para editar papeis.");
      return;
    }

    setEditingRoleId(role.id);
    setForm({
      name: role.name,
      description: role.description,
      permissionIds: role.permissions.map((permission) => permission.id),
    });
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  }

  function handleResetForm() {
    setEditingRoleId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  async function refreshRoles(page = currentPage) {
    const freshRoles = await listRoles(page, perPage);
    setRoles(freshRoles.data);
    setCurrentPage(freshRoles.meta.current_page);
    setLastPage(freshRoles.meta.last_page);
    setTotalRoles(freshRoles.meta.total);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingRoleId && !canUpdateRoles) {
        setError("Voce nao tem permissao para atualizar papeis.");
        return;
      }

      if (!editingRoleId && !canCreateRoles) {
        setError("Voce nao tem permissao para criar papeis.");
        return;
      }

      const payload = {
        name: form.name,
        description: form.description,
        permission_ids: form.permissionIds,
      };

      if (editingRoleId) {
        await updateRole(editingRoleId, payload);
        setSuccess("Papel atualizado com sucesso.");
      } else {
        await createRole(payload);
        setSuccess("Papel criado com sucesso.");
      }

      await refreshRoles(editingRoleId ? currentPage : 1);
      handleResetForm();
      setIsCreateModalOpen(false);
    } catch (submissionError) {
      setError(toApiError(submissionError, "Nao foi possivel salvar o papel."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(role: RoleType) {
    if (!canDeleteRoles) {
      setError("Voce nao tem permissao para excluir papeis.");
      return;
    }

    const shouldDelete = window.confirm(`Deseja remover o papel "${role.name}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeRole(role.id);
      const targetPage = roles.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      await refreshRoles(targetPage);
      if (editingRoleId === role.id) {
        handleResetForm();
      }
      setSuccess("Papel removido com sucesso.");
    } catch (deleteError) {
      setError(toApiError(deleteError, "Nao foi possivel remover o papel."));
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando papeis...</p>
        </Card>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (hasForbiddenAccess) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Acesso negado
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce nao possui permissao para visualizar papeis.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>roles.view</strong>.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <RolesListSection
        roles={roles}
        totalRoles={totalRoles}
        currentPage={currentPage}
        lastPage={lastPage}
        canCreateRoles={canCreateRoles}
        canUpdateRoles={canUpdateRoles}
        canDeleteRoles={canDeleteRoles}
        error={error}
        success={success}
        onOpenCreate={() => {
          handleResetForm();
          setIsCreateModalOpen(true);
        }}
        onEdit={handleSelectRole}
        onDelete={(role) => void handleDelete(role)}
        onPageChange={(page) => void refreshRoles(page)}
      />

      <RolesCreateModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          handleResetForm();
        }}
        form={form}
        permissions={permissions}
        selectedPermissions={selectedPermissions}
        canCreateRoles={canCreateRoles}
        canUpdateRoles={canUpdateRoles}
        editingRoleId={editingRoleId}
        isSubmitting={isSubmitting}
        error={error}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
