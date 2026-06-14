import { Link } from "react-router-dom";
import type { AgendaOptionsType } from "../../../types/event/agenda-options-type";
import type { EventType } from "../../../types/event/event-type";
import { Alert, Badge, Button, Card, Input, Select } from "../../core";

export interface AgendaFilterState {
  startsFrom: string;
  endsTo: string;
  search: string;
  cityId: string;
  sortDirection: "asc" | "desc";
}

interface AgendaListSectionProps {
  events: EventType[];
  options: AgendaOptionsType;
  filters: AgendaFilterState;
  totalEvents: number;
  currentPage: number;
  lastPage: number;
  error: string | null;
  success: string | null;
  onOpenCreate: () => void;
  onChangeFilters: (patch: Partial<AgendaFilterState>) => void;
  onApplyFilters: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onEdit: (eventItem: EventType) => void;
  onDelete: (eventItem: EventType) => void;
  onPageChange: (page: number) => void;
  formatEventType: (type: EventType["type"]) => string;
  formatDateTime: (value: string) => string;
}

export function AgendaListSection({
  events,
  options,
  filters,
  totalEvents,
  currentPage,
  lastPage,
  error,
  success,
  onOpenCreate,
  onChangeFilters,
  onApplyFilters,
  onResetFilters,
  onEdit,
  onDelete,
  onPageChange,
  formatEventType,
  formatDateTime,
}: AgendaListSectionProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Calendario
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
            Eventos do periodo
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Use os filtros para localizar compromissos do periodo e abra o modal
            para criar novos registros.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onOpenCreate}>
            Novo evento
          </Button>
          <Link to="/painel/lembretes">
            <Button type="button" tone="neutral" variant="outline">
              Lembretes
            </Button>
          </Link>
        </div>
      </div>

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mt-6">{success}</Alert> : null}

      <form
        className="mt-8 grid gap-4 rounded-[28px] border border-border bg-background/70 p-5"
        onSubmit={onApplyFilters}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_1fr_1fr]">
          <Input
            type="date"
            label="Data inicial"
            value={filters.startsFrom}
            onChange={(event) => onChangeFilters({ startsFrom: event.target.value })}
          />
          <Input
            type="date"
            label="Data final"
            value={filters.endsTo}
            onChange={(event) => onChangeFilters({ endsTo: event.target.value })}
          />
          <Input
            label="Buscar"
            value={filters.search}
            onChange={(event) => onChangeFilters({ search: event.target.value })}
            placeholder="Titulo ou local"
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
            label="Ordem"
            value={filters.sortDirection}
            onChange={(event) =>
              onChangeFilters({
                sortDirection: event.target.value as AgendaFilterState["sortDirection"],
              })
            }
            options={[
              { value: "asc", label: "Crescente" },
              { value: "desc", label: "Decrescente" },
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
        {events.length > 0 ? (
          events.map((eventItem) => (
            <article
              key={eventItem.id}
              className="rounded-3xl border border-border bg-surface-strong p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {eventItem.title}
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-muted">
                    {eventItem.location}
                  </p>
                </div>
                <Badge tone="primary">{formatEventType(eventItem.type)}</Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm leading-7 text-muted">
                <p>
                  <strong className="text-foreground">Inicio:</strong>{" "}
                  {formatDateTime(eventItem.starts_at)}
                </p>
                <p>
                  <strong className="text-foreground">Termino:</strong>{" "}
                  {formatDateTime(eventItem.ends_at)}
                </p>
                {eventItem.city ? (
                  <p>
                    <strong className="text-foreground">Cidade:</strong>{" "}
                    {eventItem.city.name}
                  </p>
                ) : null}
                {eventItem.description ? <p>{eventItem.description}</p> : null}
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  tone="neutral"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(eventItem)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  tone="danger"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(eventItem)}
                >
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            Nenhum evento no periodo selecionado.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-background-strong px-4 py-3 text-xs text-muted">
          <span>Total: {totalEvents}</span>
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
