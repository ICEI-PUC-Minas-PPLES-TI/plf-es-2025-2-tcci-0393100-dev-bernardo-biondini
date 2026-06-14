import type { ManagedUserType } from "../../../types/user/managed-user-type";
import { Alert, Badge, Button, Card } from "../../core";

interface UsersListSectionProps {
  users: ManagedUserType[];
  totalUsers: number;
  currentPage: number;
  lastPage: number;
  canCreateUsers: boolean;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onPageChange: (page: number) => void;
}

export function UsersListSection({
  users,
  totalUsers,
  currentPage,
  lastPage,
  canCreateUsers,
  error,
  success,
  onOpenCreate,
  onPageChange,
}: UsersListSectionProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Usuarios cadastrados
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestao de usuarios
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Consulte os usuarios cadastrados e abra o modal para novas criacoes.
          </p>
        </div>

        {canCreateUsers ? (
          <Button type="button" onClick={onOpenCreate}>
            Novo usuario
          </Button>
        ) : null}
      </div>

      {!canCreateUsers ? (
        <Alert tone="warning" className="mt-6">
          Solicite a permissao <strong>users.create</strong> para cadastrar novos
          usuarios.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

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
                <Badge tone="primary">
                  {user.access_profile?.name ?? "Sem perfil"}
                </Badge>
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
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <span>
              Pagina {currentPage} de {lastPage}
            </span>
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= lastPage}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
