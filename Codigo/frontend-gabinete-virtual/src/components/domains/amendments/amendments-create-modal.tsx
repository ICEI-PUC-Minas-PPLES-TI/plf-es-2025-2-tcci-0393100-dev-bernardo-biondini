import type { FormEvent } from "react";
import type { AmendmentOptionsType } from "../../../types/amendment/amendment-options-type";
import type {
  AmendmentStatusType,
} from "../../../types/amendment/amendment-type";
import { Alert, Button, Input, Modal, Select } from "../../core";

export interface AmendmentFormState {
  number: string;
  amount: string;
  status: AmendmentStatusType;
  cityId: string;
  applicationArea: string;
}

interface AmendmentsCreateModalProps {
  open: boolean;
  onClose: () => void;
  form: AmendmentFormState;
  options: AmendmentOptionsType;
  editingAmendmentId: number | null;
  isSubmitting: boolean;
  error: string | null;
  onChange: (patch: Partial<AmendmentFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const fallbackStatuses = [
  { value: "planned", label: "Planejada" },
  { value: "in_execution", label: "Em execucao" },
  { value: "completed", label: "Concluida" },
];

export function AmendmentsCreateModal({
  open,
  onClose,
  form,
  options,
  editingAmendmentId,
  isSubmitting,
  error,
  onChange,
  onSubmit,
}: AmendmentsCreateModalProps) {
  const statuses = options.statuses.length > 0 ? options.statuses : fallbackStatuses;

  return (
    <Modal
      open={open}
      onClose={onClose}
      headerBadge="Cadastro de emendas"
      title={editingAmendmentId ? "Editar emenda" : "Nova emenda"}
      subtitle="Crie, edite e remova emendas com cidade, status, valor e area de aplicacao."
    >
      <div className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Numero"
            value={form.number}
            onChange={(event) => onChange({ number: event.target.value })}
            placeholder="Ex.: E-45/2025"
            required
          />

          <Input
            type="number"
            min="0"
            step="0.01"
            label="Valor"
            value={form.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            placeholder="Ex.: 500000"
            required
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(event) =>
              onChange({ status: event.target.value as AmendmentStatusType })
            }
            required
            options={statuses}
          />

          <Select
            label="Cidade"
            value={form.cityId}
            onChange={(event) => onChange({ cityId: event.target.value })}
            required
            options={[
              { value: "", label: "Selecione uma cidade" },
              ...options.cities.map((city) => ({
                value: city.id,
                label: `${city.name} - ${city.region}`,
              })),
            ]}
          />

          <Select
            label="Area de aplicacao"
            value={form.applicationArea}
            onChange={(event) => onChange({ applicationArea: event.target.value })}
            required
            options={[
              { value: "", label: "Selecione uma area" },
              ...options.application_areas.map((area) => ({
                value: area.value,
                label: area.label,
              })),
            ]}
          />

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
              {editingAmendmentId ? "Atualizar emenda" : "Criar emenda"}
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
