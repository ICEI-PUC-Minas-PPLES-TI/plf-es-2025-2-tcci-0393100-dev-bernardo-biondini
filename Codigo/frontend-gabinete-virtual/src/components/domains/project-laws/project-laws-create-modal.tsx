import type { FormEvent } from "react";
import type { ProjectLawOptionsType } from "../../../types/project-law/project-law-options-type";
import type { ProjectLawStatusType } from "../../../types/project-law/project-law-type";
import { Alert, Button, Input, Modal, Select, Textarea } from "../../core";

export interface ProjectLawFormState {
  number: string;
  description: string;
  status: ProjectLawStatusType;
  protocolDate: string;
}

interface ProjectLawsCreateModalProps {
  open: boolean;
  onClose: () => void;
  form: ProjectLawFormState;
  options: ProjectLawOptionsType;
  editingProjectLawId: number | null;
  isSubmitting: boolean;
  error: string | null;
  onChange: (patch: Partial<ProjectLawFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const fallbackStatuses = [
  { value: "in_committee", label: "Em comissão" },
  { value: "in_voting", label: "Em votação" },
  { value: "approved", label: "Aprovado" },
  { value: "sanctioned", label: "Sancionado" },
];

export function ProjectLawsCreateModal({
  open,
  onClose,
  form,
  options,
  editingProjectLawId,
  isSubmitting,
  error,
  onChange,
  onSubmit,
}: ProjectLawsCreateModalProps) {
  const statuses = options.statuses.length > 0 ? options.statuses : fallbackStatuses;

  return (
    <Modal
      open={open}
      onClose={onClose}
      headerBadge="Cadastro de projetos de lei"
      title={editingProjectLawId ? "Editar projeto de lei" : "Novo projeto de lei"}
      subtitle="Crie, edite e remova projetos de lei com status e data de protocolo."
    >
      <div className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Numero"
            value={form.number}
            onChange={(event) => onChange({ number: event.target.value })}
            placeholder="Ex.: PL 234/2025"
            required
          />

          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Descricao do projeto de lei"
            required
            rows={4}
            className="min-h-24"
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(event) =>
              onChange({ status: event.target.value as ProjectLawStatusType })
            }
            required
            options={statuses}
          />

          <Input
            type="date"
            label="Data de protocolo"
            value={form.protocolDate}
            onChange={(event) => onChange({ protocolDate: event.target.value })}
            required
          />

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
              {editingProjectLawId ? "Atualizar projeto de lei" : "Criar projeto de lei"}
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
