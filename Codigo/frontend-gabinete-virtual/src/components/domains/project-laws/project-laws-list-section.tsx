import type {
  ProjectLawStatusType,
  ProjectLawType,
} from "../../../types/project-law/project-law-type";
import type { ProjectLawOptionsType } from "../../../types/project-law/project-law-options-type";
import type { BadgeTone } from "../../core";
import { Alert, Badge, Button, Card, Input, Select } from "../../core";

export interface ProjectLawFilterState {
  search: string;
  status: "" | ProjectLawStatusType;
  sortBy: "created_at" | "number" | "protocol_date";
  sortDirection: "asc" | "desc";
}

interface ProjectLawsListSectionProps {
  projectLaws: ProjectLawType[];
  options: ProjectLawOptionsType;
  filters: ProjectLawFilterState;
  totalProjectLaws: number;
  currentPage: number;
  lastPage: number;
  canMutateProjectLaws: boolean;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onChangeFilters: (patch: Partial<ProjectLawFilterState>) => void;
  onApplyFilters: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onEdit: (projectLaw: ProjectLawType) => void;
  onDelete: (projectLaw: ProjectLawType) => void;
  onPageChange: (page: number) => void;
  formatStatusLabel: (status: ProjectLawStatusType) => string;
  formatStatusTone: (status: ProjectLawStatusType) => BadgeTone;
  formatDate: (value: string) => string;
}

const fallbackStatuses = [
  { value: "in_committee", label: "Em comissão" },
  { value: "in_voting", label: "Em votação" },
  { value: "approved", label: "Aprovado" },
  { value: "sanctioned", label: "Sancionado" },
];

export function ProjectLawsListSection({
  projectLaws,
  options,
  filters,
  totalProjectLaws,
  currentPage,
  lastPage,
  canMutateProjectLaws,
  error,
  success,
  onOpenCreate,
  onChangeFilters,
  onApplyFilters,
  onResetFilters,
  onEdit,
  onDelete,
  onPageChange,
  formatStatusLabel,
  formatStatusTone,
  formatDate,
}: ProjectLawsListSectionProps) {
  const statuses = options.statuses.length > 0 ? options.statuses : fallbackStatuses;

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Projetos de lei
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Listagem de projetos de lei
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Use os filtros para localizar projetos por numero, status ou data.
          </p>
        </div>

        {canMutateProjectLaws ? (
          <Button type="button" onClick={onOpenCreate}>
            Novo projeto de lei
          </Button>
        ) : null}
      </div>

      {!canMutateProjectLaws ? (
        <Alert tone="warning" className="mt-6">
          Para editar, solicite a permissao <strong>project_laws.manage</strong>.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

      <form
        className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
        onSubmit={onApplyFilters}
      >
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_0.9fr_0.9fr]">
          <Input
            label="Buscar"
            value={filters.search}
            onChange={(event) => onChangeFilters({ search: event.target.value })}
            placeholder="Numero ou descricao"
          />

          <Select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              onChangeFilters({
                status: event.target.value as ProjectLawFilterState["status"],
              })
            }
            options={[
              { value: "", label: "Todos os status" },
              ...statuses,
            ]}
          />

          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(event) =>
              onChangeFilters({
                sortBy: event.target.value as ProjectLawFilterState["sortBy"],
              })
            }
            options={[
              { value: "created_at", label: "Data de criacao" },
              { value: "number", label: "Numero" },
              { value: "protocol_date", label: "Data de protocolo" },
            ]}
          />

          <Select
            label="Ordem"
            value={filters.sortDirection}
            onChange={(event) =>
              onChangeFilters({
                sortDirection: event.target.value as ProjectLawFilterState["sortDirection"],
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
        {projectLaws.length > 0 ? (
          projectLaws.map((projectLaw) => (
            <article
              key={projectLaw.id}
              className="rounded-3xl border border-border bg-surface-strong p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {projectLaw.number}
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-muted">
                    {projectLaw.description}
                  </p>
                </div>
                <Badge tone={formatStatusTone(projectLaw.status)}>
                  {formatStatusLabel(projectLaw.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                <p>
                  <strong className="text-foreground">Protocolo:</strong>{" "}
                  {formatDate(projectLaw.protocol_date)}
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  tone="neutral"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(projectLaw)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  tone="danger"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(projectLaw)}
                >
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            Nenhum projeto de lei cadastrado ate o momento.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
          <span>Total: {totalProjectLaws}</span>
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
