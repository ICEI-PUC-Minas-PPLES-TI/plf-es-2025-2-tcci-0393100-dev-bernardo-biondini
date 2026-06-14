import type { RoleType } from "../../../types/role/role-type";
import { Alert, Badge, Button, Card } from "../../core";

interface RolesListSectionProps {
  roles: RoleType[];
  totalRoles: number;
  currentPage: number;
  lastPage: number;
  canCreateRoles: boolean;
  canUpdateRoles: boolean;
  canDeleteRoles: boolean;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onEdit: (role: RoleType) => void;
  onDelete: (role: RoleType) => void;
  onPageChange: (page: number) => void;
}

export function RolesListSection({
  roles,
  totalRoles,
  currentPage,
  lastPage,
  canCreateRoles,
  canUpdateRoles,
  canDeleteRoles,
  error,
  success,
  onOpenCreate,
  onEdit,
  onDelete,
  onPageChange,
}: RolesListSectionProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Papeis cadastrados
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestao de papeis e permissoes
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Separe consulta e criacao. O formulario fica em modal e a listagem ocupa
            toda a largura disponivel.
          </p>
        </div>

        {canCreateRoles || canUpdateRoles ? (
          <Button type="button" onClick={onOpenCreate}>
            Novo papel
          </Button>
        ) : null}
      </div>

      {!canCreateRoles && !canUpdateRoles ? (
        <Alert tone="warning" className="mt-6">
          Para editar, solicite as permissoes <strong>roles.create</strong> ou{" "}
          <strong>roles.update</strong>.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

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
                    <Badge key={permission.id} tone="primary">
                      {permission.code}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted">Nenhuma permissao vinculada.</p>
                )}
              </div>

              <div className="mt-5 flex gap-2">
                {canUpdateRoles ? (
                  <Button
                    type="button"
                    tone="neutral"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(role)}
                  >
                    Editar
                  </Button>
                ) : null}
                {canDeleteRoles ? (
                  <Button
                    type="button"
                    tone="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(role)}
                  >
                    Excluir
                  </Button>
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
