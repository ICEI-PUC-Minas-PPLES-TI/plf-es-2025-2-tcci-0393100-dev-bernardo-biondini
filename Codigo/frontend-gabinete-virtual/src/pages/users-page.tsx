import { FormEvent, useEffect, useState } from "react";
import {
  createUser,
  listAccessProfilesForUsers,
  listUsers,
  toApiError,
} from "../lib/user-api";
import { hasPermission, PERMISSION_CODES } from "../lib/permission-codes";
import { getAuthenticatedUserByToken, getStoredToken } from "../lib/auth";
import type { AccessProfileType } from "../types/access-profile";
import type { ManagedUserType } from "../types/user/managed-user-type";

interface UserFormState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  accessProfileId: string;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  accessProfileId: "",
};

export function UsersPage() {
  const perPage = 10;
  const [users, setUsers] = useState<ManagedUserType[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfileType[]>([]);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canCreateUsers = hasPermission(
    permissionCodes,
    PERMISSION_CODES.USERS_CREATE,
  );

  useEffect(() => {
    async function loadData() {
      const token = getStoredToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const authenticatedUser = await getAuthenticatedUserByToken(token);

        if (!authenticatedUser) {
          setIsLoading(false);
          return;
        }

        setPermissionCodes(authenticatedUser.permissions);

        const shouldLoadAccessProfiles = hasPermission(
          authenticatedUser.permissions,
          PERMISSION_CODES.USERS_CREATE,
        );

        const [usersResponse, accessProfilesResponse] = await Promise.all([
          listUsers(1, perPage),
          shouldLoadAccessProfiles
            ? listAccessProfilesForUsers()
            : Promise.resolve([]),
        ]);

        setUsers(usersResponse.data);
        setCurrentPage(usersResponse.meta.current_page);
        setLastPage(usersResponse.meta.last_page);
        setTotalUsers(usersResponse.meta.total);
        setAccessProfiles(accessProfilesResponse);
      } catch (requestError) {
        setError(
          toApiError(requestError, "Nao foi possivel carregar os usuarios."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function refreshUsers(page = currentPage) {
    const response = await listUsers(page, perPage);
    setUsers(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalUsers(response.meta.total);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!canCreateUsers) {
        setError("Voce nao tem permissao para criar usuarios.");
        return;
      }

      if (!form.accessProfileId) {
        setError("Selecione um perfil de acesso.");
        return;
      }

      await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        access_profile_id: Number(form.accessProfileId),
      });

      await refreshUsers(1);
      setForm(EMPTY_FORM);
      setSuccess("Usuario criado com sucesso.");
    } catch (submissionError) {
      setError(
        toApiError(submissionError, "Nao foi possivel criar o usuario."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando usuarios...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      {canCreateUsers ? (
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Cadastro de usuarios
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Criacao de usuarios
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Crie usuarios e vincule o perfil de acesso desejado.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nome do usuario"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="usuario@dominio.com"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Perfil de acesso
              </span>
              <select
                value={form.accessProfileId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accessProfileId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione um perfil</option>
                {accessProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Senha</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Minimo de 8 caracteres"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Confirmacao de senha
              </span>
              <input
                type="password"
                value={form.passwordConfirmation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value,
                  }))
                }
                placeholder="Repita a senha"
                required
              />
            </label>

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
                disabled={isSubmitting}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Salvando..." : "Criar usuario"}
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
            Voce pode visualizar usuarios, mas nao pode cria-los.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Solicite a permissao <strong>users.create</strong> para cadastrar novos usuarios.
          </p>
          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
        </section>
      )}

      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Usuarios cadastrados
        </p>
        <div className="mt-6 grid gap-4">
          {users.length > 0 ? (
            users.map((user) => (
              <article
                key={user.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                <p className="mt-1 text-sm leading-7 text-muted">{user.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {user.access_profile?.name ?? "Sem perfil"}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-muted">
              Nenhum usuario cadastrado ate o momento.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
            <span>Total: {totalUsers}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshUsers(currentPage - 1)}
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
                onClick={() => refreshUsers(currentPage + 1)}
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
