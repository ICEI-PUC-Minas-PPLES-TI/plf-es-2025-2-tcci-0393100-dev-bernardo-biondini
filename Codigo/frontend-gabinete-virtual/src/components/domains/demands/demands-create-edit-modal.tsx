import type {
  DemandOptionsType,
  ManagedDemandHistoryType,
  ManagedDemandType,
} from "../../../types/demand/managed-demand-type";
import { Alert, Button, Input, Modal, Select, Textarea } from "../../core";
import type { DemandFormState, DemandModalMode } from "./types";

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: "Titulo",
    description: "Descricao",
    service_area: "Area atendida",
    oficio_original_name: "Oficio",
    status: "Status",
    priority: "Prioridade",
    responsible_user_id: "Responsavel",
    city_id: "Cidade",
    institution_id: "Instituicao",
  };

  return labels[field] ?? field;
}

function renderMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (value === null || typeof value === "undefined") {
    return "Nao informado";
  }

  return JSON.stringify(value);
}

function HistoryMetadata({
  metadata,
}: {
  metadata: ManagedDemandHistoryType["metadata"];
}) {
  if (!metadata) {
    return null;
  }

  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-background px-4 py-3">
      {entries.map(([field, change]) => {
        const value =
          change && typeof change === "object" && "from" in change && "to" in change
            ? (change as { from?: unknown; to?: unknown })
            : null;

        return (
          <div key={field} className="text-xs leading-6 text-muted">
            <span className="font-semibold text-foreground">
              {formatFieldLabel(field)}:
            </span>{" "}
            {value
              ? `${renderMetadataValue(value.from)} -> ${renderMetadataValue(value.to)}`
              : renderMetadataValue(change)}
          </div>
        );
      })}
    </div>
  );
}

interface DemandsCreateEditModalProps {
  open: boolean;
  onClose: () => void;
  modalMode: DemandModalMode;
  activeDemand: ManagedDemandType | null;
  form: DemandFormState;
  options: DemandOptionsType;
  filteredInstitutions: DemandOptionsType["institutions"];
  oficioFile: File | null;
  removeOficio: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  demandHistories: ManagedDemandHistoryType[];
  historyCurrentPage: number;
  historyLastPage: number;
  historyTotal: number;
  isHistoryLoading: boolean;
  historyError: string | null;
  onChangeForm: (patch: Partial<DemandFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSetOficioFile: (file: File | null) => void;
  onSetRemoveOficio: (value: boolean) => void;
  onDownloadOficio: (demand: ManagedDemandType) => void;
  onHistoryPageChange: (page: number) => void;
  formatHistoryAction: (action: string) => string;
  formatDateTime: (value: string) => string;
}

export function DemandsCreateEditModal({
  open,
  onClose,
  modalMode,
  activeDemand,
  form,
  options,
  filteredInstitutions,
  oficioFile,
  removeOficio,
  isSubmitting,
  error,
  success,
  demandHistories,
  historyCurrentPage,
  historyLastPage,
  historyTotal,
  isHistoryLoading,
  historyError,
  onChangeForm,
  onSubmit,
  onSetOficioFile,
  onSetRemoveOficio,
  onDownloadOficio,
  onHistoryPageChange,
  formatHistoryAction,
  formatDateTime,
}: DemandsCreateEditModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      headerBadge={modalMode === "edit" ? "Editar demanda" : "Nova demanda"}
      title={modalMode === "edit" ? activeDemand?.title : "Criar demanda"}
      contentClassName="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]"
    >
      <section className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Titulo"
            value={form.title}
            onChange={(event) => onChangeForm({ title: event.target.value })}
            placeholder="Titulo da demanda"
            required
          />

          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(event) => onChangeForm({ description: event.target.value })}
            placeholder="Descricao detalhada da demanda"
            rows={5}
            required
          />

          <Select
            label="Area atendida"
            value={form.serviceArea}
            onChange={(event) => onChangeForm({ serviceArea: event.target.value })}
            required
            options={[
              { value: "", label: "Selecione a area da demanda" },
              ...options.service_areas.map((serviceArea) => ({
                value: serviceArea.value,
                label: serviceArea.label,
              })),
            ]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                onChangeForm({
                  status: event.target.value as DemandFormState["status"],
                })
              }
              options={[
                { value: "open", label: "Aberta" },
                { value: "under_review", label: "Em analise" },
                { value: "in_progress", label: "Em andamento" },
                { value: "completed", label: "Concluida" },
                { value: "discarded", label: "Descartada" },
              ]}
            />

            <Select
              label="Prioridade"
              value={form.priority}
              onChange={(event) =>
                onChangeForm({
                  priority: event.target.value as DemandFormState["priority"],
                })
              }
              options={[
                { value: "", label: "Nao definida" },
                { value: "low", label: "Baixa" },
                { value: "medium", label: "Media" },
                { value: "high", label: "Alta" },
              ]}
            />
          </div>

          <Select
            label="Usuario responsavel"
            value={form.responsibleUserId}
            onChange={(event) =>
              onChangeForm({ responsibleUserId: event.target.value })
            }
            options={[
              { value: "", label: "Sem responsavel definido" },
              ...options.users.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.email})`,
              })),
            ]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Cidade"
              value={form.cityId}
              onChange={(event) =>
                onChangeForm({
                  cityId: event.target.value,
                  institutionId: "",
                })
              }
              required
              options={[
                { value: "", label: "Selecione a cidade" },
                ...options.cities.map((city) => ({
                  value: city.id,
                  label: `${city.name} (${city.region})`,
                })),
              ]}
            />

            <Select
              label="Instituicao"
              value={form.institutionId}
              onChange={(event) =>
                onChangeForm({ institutionId: event.target.value })
              }
              options={[
                { value: "", label: "Sem instituicao vinculada" },
                ...filteredInstitutions.map((institution) => ({
                  value: institution.id,
                  label: `${institution.name} (${institution.type})`,
                })),
              ]}
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Oficio vinculado</p>
                <p className="text-xs leading-6 text-muted">
                  Aceita PDF, imagem, DOC/DOCX e planilhas.
                </p>
              </div>

              {activeDemand?.oficio_original_name && !removeOficio ? (
                <Button
                  type="button"
                  tone="primary"
                  variant="soft"
                  size="sm"
                  onClick={() => onDownloadOficio(activeDemand)}
                >
                  Baixar oficio atual
                </Button>
              ) : null}
            </div>

            {activeDemand?.oficio_original_name ? (
              <p className="text-sm leading-6 text-muted">
                Atual:{" "}
                <strong className="text-foreground">
                  {activeDemand.oficio_original_name}
                </strong>
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Nenhum oficio anexado a esta demanda.
              </p>
            )}

            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {activeDemand?.oficio_original_name ? "Substituir oficio" : "Anexar oficio"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ods,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  onSetOficioFile(file);

                  if (file) {
                    onSetRemoveOficio(false);
                  }
                }}
              />
            </div>

            {oficioFile ? (
              <p className="text-sm leading-6 text-muted">
                Novo arquivo selecionado:{" "}
                <strong className="text-foreground">{oficioFile.name}</strong>
              </p>
            ) : null}

            {modalMode === "edit" && activeDemand?.oficio_original_name ? (
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={removeOficio}
                  onChange={(event) => {
                    const shouldRemove = event.target.checked;
                    onSetRemoveOficio(shouldRemove);

                    if (shouldRemove) {
                      onSetOficioFile(null);
                    }
                  }}
                />
                Remover oficio atual
              </label>
            ) : null}
          </div>

          {error ? <Alert tone="danger">{error}</Alert> : null}
          {success ? <Alert tone="success">{success}</Alert> : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Salvando..."
            >
              {modalMode === "edit" ? "Salvar alteracoes" : "Criar demanda"}
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
      </section>

      <aside className="border-t border-border bg-background/60 p-6 xl:border-l xl:border-t-0">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Historico
        </p>
        <h4 className="mt-3 text-2xl font-semibold text-foreground">
          {modalMode === "edit" ? "Alteracoes registradas" : "Historico disponivel apos criar"}
        </h4>
        <p className="mt-3 text-sm leading-7 text-muted">
          {modalMode === "edit"
            ? "Cada salvamento com mudancas gera automaticamente um registro de historico para esta demanda."
            : "O historico desta demanda sera criado automaticamente quando ela for salva e passar por alteracoes."}
        </p>

        {modalMode === "edit" ? (
          <>
            {historyError ? <Alert tone="danger" className="mt-6">{historyError}</Alert> : null}

            <div className="mt-6 grid gap-4">
              {isHistoryLoading ? (
                <p className="text-sm leading-7 text-muted">Carregando historico...</p>
              ) : demandHistories.length > 0 ? (
                demandHistories.map((history) => (
                  <article
                    key={history.id}
                    className="rounded-3xl border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                        {formatHistoryAction(history.action)}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDateTime(history.created_at)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {history.description}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-muted">
                      Responsavel pelo registro: {history.user?.name ?? "Nao identificado"}
                    </p>

                    <HistoryMetadata metadata={history.metadata} />
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  Nenhuma alteracao registrada ate o momento.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted">
              <span>Total: {historyTotal}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  tone="neutral"
                  variant="outline"
                  size="sm"
                  onClick={() => onHistoryPageChange(historyCurrentPage - 1)}
                  disabled={historyCurrentPage <= 1 || isHistoryLoading}
                >
                  Anterior
                </Button>
                <span>
                  Pagina {historyCurrentPage} de {historyLastPage}
                </span>
                <Button
                  type="button"
                  tone="neutral"
                  variant="outline"
                  size="sm"
                  onClick={() => onHistoryPageChange(historyCurrentPage + 1)}
                  disabled={historyCurrentPage >= historyLastPage || isHistoryLoading}
                >
                  Proxima
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </Modal>
  );
}
