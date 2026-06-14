import { useEffect, useState } from "react";
import {
  createUser,
  listAccessProfilesForUsers,
  listUsers,
  toApiError,
} from "../../../lib/user-api";
import { hasPermission, PERMISSION_CODES } from "../../../lib/permission-codes";
import { getAuthenticatedUserByToken, getStoredToken } from "../../../lib/auth";
import type { AccessProfileType } from "../../../types/access-profile";
import type { ManagedUserType } from "../../../types/user/managed-user-type";
import { Card } from "../../core";
import { UsersCreateModal, type UserFormState } from "./users-create-modal";
import { UsersListSection } from "./users-list-section";

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  accessProfileId: "",
};

export function UsersManagement() {
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        setError(toApiError(requestError, "Nao foi possivel carregar os usuarios."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  async function refreshUsers(page = currentPage) {
    const response = await listUsers(page, perPage);
    setUsers(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalUsers(response.meta.total);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setIsCreateModalOpen(false);
      setSuccess("Usuario criado com sucesso.");
    } catch (submissionError) {
      setError(toApiError(submissionError, "Nao foi possivel criar o usuario."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <Card padding="lg">
          <p className="text-sm leading-7 text-muted">Carregando usuarios...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <UsersListSection
        users={users}
        totalUsers={totalUsers}
        currentPage={currentPage}
        lastPage={lastPage}
        canCreateUsers={canCreateUsers}
        error={error}
        success={success}
        onOpenCreate={() => {
          setError(null);
          setSuccess(null);
          setForm(EMPTY_FORM);
          setIsCreateModalOpen(true);
        }}
        onPageChange={(page) => void refreshUsers(page)}
      />

      <UsersCreateModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
        }}
        form={form}
        accessProfiles={accessProfiles}
        isSubmitting={isSubmitting}
        error={error}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
