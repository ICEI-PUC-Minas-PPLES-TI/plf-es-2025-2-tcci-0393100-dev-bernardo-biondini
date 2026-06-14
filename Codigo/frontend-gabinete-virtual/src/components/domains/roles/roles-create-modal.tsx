import type { FormEvent } from "react";
import type { PermissionType } from "../../../types/permission/permission-type";
import { Alert, Badge, Button, Input, Modal, Select, Textarea } from "../../core";

export interface RoleFormState {
  name: string;
  description: string;
  permissionIds: number[];
}

interface RolesCreateModalProps {
  open: boolean;
  onClose: () => void;
  form: RoleFormState;
  permissions: PermissionType[];
  selectedPermissions: PermissionType[];
  canCreateRoles: boolean;
  canUpdateRoles: boolean;
  editingRoleId: number | null;
  isSubmitting: boolean;
  error: string | null;
  onChange: (patch: Partial<RoleFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function RolesCreateModal({
  open,
  onClose,
  form,
  permissions,
  selectedPermissions,
  canCreateRoles,
  canUpdateRoles,
  editingRoleId,
  isSubmitting,
  error,
  onChange,
  onSubmit,
}: RolesCreateModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      headerBadge="Cadastro de papeis"
      title={editingRoleId ? "Editar papel" : "Novo papel"}
      subtitle="Crie, edite e remova papeis. O campo de permissoes usa selecao multipla."
    >
      <div className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Nome"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Ex.: Gestor"
            required
          />

          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Descricao do papel"
            required
            rows={4}
            className="min-h-24"
          />

          <Select
            multiple
            label="Permissoes"
            value={form.permissionIds.map(String)}
            onChange={(event) => {
              const selectedValues = Array.from(event.target.selectedOptions).map(
                (option) => Number(option.value),
              );

              onChange({ permissionIds: selectedValues });
            }}
            className="min-h-44"
          >
            {permissions.map((permission) => (
              <option key={permission.id} value={permission.id}>
                {permission.code} - {permission.description}
              </option>
            ))}
          </Select>

          <p className="text-xs leading-6 text-muted">
            Dica: use Ctrl (ou Command) para selecionar mais de uma permissao.
          </p>

          {selectedPermissions.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface-strong p-3">
              {selectedPermissions.map((permission) => (
                <Badge key={permission.id} tone="primary">
                  {permission.code}
                </Badge>
              ))}
            </div>
          ) : null}

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                isSubmitting || (editingRoleId ? !canUpdateRoles : !canCreateRoles)
              }
              isLoading={isSubmitting}
              loadingText="Salvando..."
            >
              {editingRoleId ? "Atualizar papel" : "Criar papel"}
            </Button>

            <Button
              type="button"
              tone="neutral"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
