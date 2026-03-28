import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import {
  createRole,
  listPermissions,
  listRoles,
  removeRole,
  toApiError,
  updateRole,
} from "../lib/role-api";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import type { PermissionType } from "../types/permission/permission-type";
import type { RoleType } from "../types/role/role-type";

interface RoleFormState {
  name: string;
  description: string;
  permissionIds: number[];
}

const EMPTY_FORM: RoleFormState = {
  name: "",
  description: "",
  permissionIds: [],
};

export function RolesPage() {
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
        setError(
          toApiError(requestError, "Nao foi possivel carregar os papeis."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const canCreateRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_CREATE);
  const canUpdateRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_UPDATE);
  const canDeleteRoles = hasPermission(permissionCodes, PERMISSION_CODES.ROLES_DELETE);

  const selectedPermissions = useMemo(
    () =>
      permissions.filter((permission) => form.permissionIds.includes(permission.id)),
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    } catch (submissionError) {
      setError(
        toApiError(submissionError, "Nao foi possivel salvar o papel."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(role: RoleType) {
    if (!canDeleteRoles) {
      setError("Voce nao tem permissao para excluir papeis.");
      return;
    }

    const shouldDelete = window.confirm(
      `Deseja remover o papel "${role.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeRole(role.id);
      const targetPage = roles.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

      await refreshRoles(targetPage);
      if (editingRoleId === role.id) {
        handleResetForm();
      }
      setSuccess("Papel removido com sucesso.");
    } catch (deleteError) {
      setError(
        toApiError(deleteError, "Nao foi possivel remover o papel."),
      );
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando papeis...</p>
        </section>
      </main>
    );
  }

  if (hasInvalidSession) {
    return <Navigate to="/login" replace />;
  }

  if (hasForbiddenAccess) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Acesso negado
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce nao possui permissao para visualizar papeis.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite ao administrador a permissao <strong>roles.view</strong>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      {canCreateRoles || canUpdateRoles ? (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Cadastro de papeis
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestão de papéis e permissões
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Crie, edite e remova papeis. O campo de permissoes usa selecao multipla.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex.: Gestor"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Descricao</span>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Descricao do papel"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Permissoes</span>
              <select
                multiple
                value={form.permissionIds.map(String)}
                onChange={(event) => {
                  const selectedValues = Array.from(event.target.selectedOptions).map(
                    (option) => Number(option.value),
                  );

                  setForm((current) => ({
                    ...current,
                    permissionIds: selectedValues,
                  }));
                }}
                className="min-h-44"
              >
                {permissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.code} - {permission.description}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs leading-6 text-muted">
              Dica: use Ctrl (ou Command) para selecionar mais de uma permissao.
            </p>

            {selectedPermissions.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface-strong p-3">
                {selectedPermissions.map((permission) => (
                  <span
                    key={permission.id}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong"
                  >
                    {permission.code}
                  </span>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
                {success}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (editingRoleId ? !canUpdateRoles : !canCreateRoles)
                }
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Salvando..."
                  : editingRoleId
                    ? "Atualizar papel"
                    : "Criar papel"}
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                disabled={isSubmitting}
                className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                Limpar formulario
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Permissoes insuficientes
          </p>
          <h2 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Voce pode visualizar papeis, mas nao pode altera-los.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Para editar, solicite as permissoes <strong>roles.create</strong> ou <strong>roles.update</strong>.
          </p>
          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
              {success}
            </div>
          ) : null}
        </section>
      )}

      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Papeis cadastrados
        </p>
        <div className="mt-6 grid gap-4">
          {roles.length > 0 ? (
            roles.map((role) => (
              <article
                key={role.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{role.name}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {role.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {role.permissions.length > 0 ? (
                    role.permissions.map((permission) => (
                      <span
                        key={permission.id}
                        className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong"
                      >
                        {permission.code}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted">Nenhuma permissao vinculada.</p>
                  )}
                </div>

                <div className="mt-5 flex gap-2">
                  {canUpdateRoles ? (
                    <button
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                    >
                      Editar
                    </button>
                  ) : null}
                  {canDeleteRoles ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(role)}
                      className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                    >
                      Excluir
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">
              Nenhum papel cadastrado ate o momento.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
            <span>Total: {totalRoles}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshRoles(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} de {lastPage}
              </span>
              <button
                type="button"
                onClick={() => refreshRoles(currentPage + 1)}
                disabled={currentPage >= lastPage}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Proxima
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
