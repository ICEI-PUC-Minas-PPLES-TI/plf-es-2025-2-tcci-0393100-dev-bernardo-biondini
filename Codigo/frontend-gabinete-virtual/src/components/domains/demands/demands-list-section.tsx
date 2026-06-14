import type {
  DemandOptionsType,
  ManagedDemandType,
} from "../../../types/demand/managed-demand-type";
import type { BadgeTone } from "../../core";
import { Alert, Badge, Button, Card, Input, Select } from "../../core";
import type { DemandFilterState } from "./types";

interface DemandsListSectionProps {
  demands: ManagedDemandType[];
  options: DemandOptionsType;
  filters: DemandFilterState;
  totalDemands: number;
  currentPage: number;
  lastPage: number;
  currentUserId: number | null;
  isRefreshingList: boolean;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onChangeFilters: (patch: Partial<DemandFilterState>) => void;
  onApplyFilters: (event?: React.FormEvent<HTMLFormElement>) => void;
  onFilterForCurrentUser: () => void;
  onClearFilters: () => void;
  onEdit: (demand: ManagedDemandType) => void;
  onDelete: (demand: ManagedDemandType) => void;
  onDownloadOficio: (demand: ManagedDemandType) => void;
  onOpenDiscardReason: (demand: ManagedDemandType) => void;
  onPageChange: (page: number) => void;
  formatStatusLabel: (status: ManagedDemandType["status"]) => string;
  formatStatusTone: (status: ManagedDemandType["status"]) => BadgeTone;
  formatPriorityLabel: (priority: ManagedDemandType["priority"]) => string;
  formatPriorityTone: (priority: ManagedDemandType["priority"]) => BadgeTone;
  formatServiceAreaLabel: (serviceArea: string | null) => string;
  formatDateTime: (value: string) => string;
}

export function DemandsListSection({
  demands,
  options,
  filters,
  totalDemands,
  currentPage,
  lastPage,
  currentUserId,
  isRefreshingList,
  error,
  success,
  onOpenCreate,
  onChangeFilters,
  onApplyFilters,
  onFilterForCurrentUser,
  onClearFilters,
  onEdit,
  onDelete,
  onDownloadOficio,
  onOpenDiscardReason,
  onPageChange,
  formatStatusLabel,
  formatStatusTone,
  formatPriorityLabel,
  formatPriorityTone,
  formatServiceAreaLabel,
  formatDateTime,
}: DemandsListSectionProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Demandas
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Gestao de demandas
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Acompanhe as demandas do gabinete em uma listagem unica e use o modal
            para criar, editar e consultar o historico de cada item.
          </p>
        </div>

        <Button type="button" onClick={onOpenCreate}>
          Nova demanda
        </Button>
      </div>

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

      <form
        className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
        onSubmit={onApplyFilters}
      >
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr_0.9fr_0.9fr_0.9fr]">
          <Input
            label="Buscar por titulo"
            value={filters.search}
            onChange={(event) => onChangeFilters({ search: event.target.value })}
            placeholder="Digite parte do titulo da demanda"
          />

          <Select
            label="Responsavel"
            value={filters.responsibleUserId}
            onChange={(event) =>
              onChangeFilters({
                responsibleUserId: event.target.value,
                onlyMine:
                  Boolean(currentUserId) &&
                  event.target.value === String(currentUserId),
              })
            }
            options={[
              { value: "", label: "Todos os responsaveis" },
              ...options.users.map((user) => ({
                value: user.id,
                label: user.name,
              })),
            ]}
          />

          <Select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              onChangeFilters({
                status: event.target.value as DemandFilterState["status"],
              })
            }
            options={[
              { value: "", label: "Todos os status" },
              { value: "open", label: "Aberta" },
              { value: "under_review", label: "Em analise" },
              { value: "in_progress", label: "Em andamento" },
              { value: "completed", label: "Concluida" },
              { value: "discarded", label: "Descartada" },
            ]}
          />

          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(event) =>
              onChangeFilters({
                sortBy: event.target.value as DemandFilterState["sortBy"],
              })
            }
            options={[
              { value: "created_at", label: "Data de criacao" },
              { value: "title", label: "Titulo" },
            ]}
          />

          <Select
            label="Ordem"
            value={filters.sortDirection}
            onChange={(event) =>
              onChangeFilters({
                sortDirection: event.target.value as DemandFilterState["sortDirection"],
              })
            }
            options={[
              { value: "desc", label: "Decrescente" },
              { value: "asc", label: "Crescente" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            tone={filters.onlyMine ? "primary" : "neutral"}
            variant={filters.onlyMine ? "solid" : "outline"}
            onClick={onFilterForCurrentUser}
            disabled={!currentUserId || isRefreshingList}
          >
            Para mim
          </Button>
          <Button
            type="submit"
            disabled={isRefreshingList}
            isLoading={isRefreshingList}
            loadingText="Aplicando..."
          >
            Aplicar filtros
          </Button>
          <Button
            type="button"
            tone="neutral"
            variant="outline"
            onClick={onClearFilters}
            disabled={isRefreshingList}
          >
            Limpar filtros
          </Button>
        </div>
      </form>

      <div className="mt-8 grid gap-4">
        {demands.length > 0 ? (
          demands.map((demand) => (
            <article
              key={demand.id}
              className="rounded-3xl border border-border bg-surface-strong p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={formatStatusTone(demand.status)}>
                      {formatStatusLabel(demand.status)}
                    </Badge>
                    <Badge tone={formatPriorityTone(demand.priority)}>
                      {formatPriorityLabel(demand.priority)}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {demand.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {demand.description}
                  </p>
                  <div className="mt-4 grid gap-1 text-xs leading-6 text-muted md:grid-cols-2">
                    <span>Responsavel: {demand.user?.name ?? "Nao informado"}</span>
                    <span>Cidade: {demand.city?.name ?? "Nao informada"}</span>
                    <span>
                      Instituicao: {demand.institution?.name ?? "Nao informada"}
                    </span>
                    <span>
                      Area atendida: {formatServiceAreaLabel(demand.service_area)}
                    </span>
                    <span>Oficio: {demand.oficio_original_name ?? "Nao anexado"}</span>
                    <span>Abertura: {formatDateTime(demand.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {demand.oficio_original_name ? (
                    <Button
                      type="button"
                      tone="primary"
                      variant="soft"
                      size="sm"
                      onClick={() => onDownloadOficio(demand)}
                    >
                      Baixar oficio
                    </Button>
                  ) : null}
                  {demand.status === "discarded" && demand.discard_message ? (
                    <Button
                      type="button"
                      tone="warning"
                      variant="soft"
                      size="sm"
                      onClick={() => onOpenDiscardReason(demand)}
                    >
                      Ver motivo
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    tone="neutral"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(demand)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    tone="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(demand)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            Nenhuma demanda cadastrada ate o momento.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
          <span>Total: {totalDemands}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isRefreshingList}
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
              disabled={currentPage >= lastPage || isRefreshingList}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
