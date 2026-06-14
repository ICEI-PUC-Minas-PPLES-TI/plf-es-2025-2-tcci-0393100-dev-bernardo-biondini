import type {
  AmendmentApplicationAreaType,
  AmendmentStatusType,
  AmendmentType,
} from "../../../types/amendment/amendment-type";
import type { AmendmentOptionsType } from "../../../types/amendment/amendment-options-type";
import type { BadgeTone } from "../../core";
import { Alert, Badge, Button, Card, Input, Select } from "../../core";

export interface AmendmentFilterState {
  search: string;
  status: "" | AmendmentStatusType;
  cityId: string;
  applicationArea: "" | AmendmentApplicationAreaType;
  sortBy: "created_at" | "number" | "amount";
  sortDirection: "asc" | "desc";
}

interface AmendmentsListSectionProps {
  amendments: AmendmentType[];
  options: AmendmentOptionsType;
  filters: AmendmentFilterState;
  totalAmendments: number;
  currentPage: number;
  lastPage: number;
  canMutateAmendments: boolean;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onChangeFilters: (patch: Partial<AmendmentFilterState>) => void;
  onApplyFilters: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onEdit: (amendment: AmendmentType) => void;
  onDelete: (amendment: AmendmentType) => void;
  onPageChange: (page: number) => void;
  formatCurrency: (value: number) => string;
  formatStatusLabel: (status: AmendmentStatusType) => string;
  formatStatusTone: (status: AmendmentStatusType) => BadgeTone;
  formatApplicationAreaLabel: (area: AmendmentApplicationAreaType) => string;
  formatCityLabel: (amendment: AmendmentType) => string;
}

const fallbackStatuses = [
  { value: "planned", label: "Planejada" },
  { value: "in_execution", label: "Em execucao" },
  { value: "completed", label: "Concluida" },
];

export function AmendmentsListSection({
  amendments,
  options,
  filters,
  totalAmendments,
  currentPage,
  lastPage,
  canMutateAmendments,
  error,
  success,
  onOpenCreate,
  onChangeFilters,
  onApplyFilters,
  onResetFilters,
  onEdit,
  onDelete,
  onPageChange,
  formatCurrency,
  formatStatusLabel,
  formatStatusTone,
  formatApplicationAreaLabel,
  formatCityLabel,
}: AmendmentsListSectionProps) {
  const statuses = options.statuses.length > 0 ? options.statuses : fallbackStatuses;

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Emendas
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Listagem de emendas cadastradas
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Use os filtros para localizar emendas por numero, status, cidade ou area.
          </p>
        </div>

        {canMutateAmendments ? (
          <Button type="button" onClick={onOpenCreate}>
            Nova emenda
          </Button>
        ) : null}
      </div>

      {!canMutateAmendments ? (
        <Alert tone="warning" className="mt-6">
          Para editar, solicite a permissao <strong>amendments.manage</strong>.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

      <form
        className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
        onSubmit={onApplyFilters}
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.9fr]">
          <Input
            label="Buscar"
            value={filters.search}
            onChange={(event) => onChangeFilters({ search: event.target.value })}
            placeholder="Numero da emenda"
          />

          <Select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              onChangeFilters({
                status: event.target.value as AmendmentFilterState["status"],
              })
            }
            options={[
              { value: "", label: "Todos os status" },
              ...statuses,
            ]}
          />

          <Select
            label="Cidade"
            value={filters.cityId}
            onChange={(event) => onChangeFilters({ cityId: event.target.value })}
            options={[
              { value: "", label: "Todas as cidades" },
              ...options.cities.map((city) => ({
                value: city.id,
                label: city.name,
              })),
            ]}
          />

          <Select
            label="Area"
            value={filters.applicationArea}
            onChange={(event) =>
              onChangeFilters({
                applicationArea: event.target.value as AmendmentFilterState["applicationArea"],
              })
            }
            options={[
              { value: "", label: "Todas as areas" },
              ...options.application_areas.map((area) => ({
                value: area.value,
                label: area.label,
              })),
            ]}
          />

          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(event) =>
              onChangeFilters({
                sortBy: event.target.value as AmendmentFilterState["sortBy"],
              })
            }
            options={[
              { value: "created_at", label: "Data de criacao" },
              { value: "number", label: "Numero" },
              { value: "amount", label: "Valor" },
            ]}
          />

          <Select
            label="Ordem"
            value={filters.sortDirection}
            onChange={(event) =>
              onChangeFilters({
                sortDirection: event.target.value as AmendmentFilterState["sortDirection"],
              })
            }
            options={[
              { value: "desc", label: "Mais recentes" },
              { value: "asc", label: "Mais antigas" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Aplicar filtros</Button>
          <Button type="button" tone="neutral" variant="outline" onClick={onResetFilters}>
            Limpar filtros
          </Button>
        </div>
      </form>

      <div className="mt-6 grid gap-4">
        {amendments.length > 0 ? (
          amendments.map((amendment) => (
            <article
              key={amendment.id}
              className="rounded-3xl border border-border bg-surface-strong p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {amendment.number}
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-muted">
                    {formatApplicationAreaLabel(amendment.application_area)}
                  </p>
                </div>
                <Badge tone={formatStatusTone(amendment.status)}>
                  {formatStatusLabel(amendment.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                <p>
                  <strong className="text-foreground">Valor:</strong>{" "}
                  {formatCurrency(amendment.amount)}
                </p>
                <p>
                  <strong className="text-foreground">Cidade:</strong>{" "}
                  {formatCityLabel(amendment)}
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  tone="neutral"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(amendment)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  tone="danger"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(amendment)}
                >
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            Nenhuma emenda cadastrada ate o momento.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
          <span>Total: {totalAmendments}</span>
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
