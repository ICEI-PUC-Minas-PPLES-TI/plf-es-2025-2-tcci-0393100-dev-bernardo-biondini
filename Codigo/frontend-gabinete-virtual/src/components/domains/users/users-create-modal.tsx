import type { FormEvent } from "react";
import type { AccessProfileType } from "../../../types/access-profile";
import { Alert, Button, Input, Modal, Select } from "../../core";

export interface UserFormState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  accessProfileId: string;
}

interface UsersCreateModalProps {
  open: boolean;
  onClose: () => void;
  form: UserFormState;
  accessProfiles: AccessProfileType[];
  isSubmitting: boolean;
  error: string | null;
  onChange: (patch: Partial<UserFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function UsersCreateModal({
  open,
  onClose,
  form,
  accessProfiles,
  isSubmitting,
  error,
  onChange,
  onSubmit,
}: UsersCreateModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      headerBadge="Cadastro de usuarios"
      title="Criacao de usuarios"
      subtitle="Crie usuarios e vincule o perfil de acesso desejado."
    >
      <div className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Nome"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Nome do usuario"
            required
          />

          <Input
            type="email"
            label="E-mail"
            value={form.email}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="usuario@dominio.com"
            required
          />

          <Select
            label="Perfil de acesso"
            value={form.accessProfileId}
            onChange={(event) => onChange({ accessProfileId: event.target.value })}
            required
            options={[
              { value: "", label: "Selecione um perfil" },
              ...accessProfiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
              })),
            ]}
          />

          <Input
            type="password"
            label="Senha"
            value={form.password}
            onChange={(event) => onChange({ password: event.target.value })}
            placeholder="Minimo de 8 caracteres"
            required
          />

          <Input
            type="password"
            label="Confirmacao de senha"
            value={form.passwordConfirmation}
            onChange={(event) =>
              onChange({ passwordConfirmation: event.target.value })
            }
            placeholder="Repita a senha"
            required
          />

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
              Criar usuario
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
