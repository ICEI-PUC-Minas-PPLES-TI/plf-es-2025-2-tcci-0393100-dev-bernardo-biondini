import type { FormEvent } from "react";
import type { AgendaOptionsType } from "../../../types/event/agenda-options-type";
import type { EventType } from "../../../types/event/event-type";
import { Alert, Button, Modal, Input, Select, Textarea } from "../../core";

export interface AgendaEventFormState {
  title: string;
  type: EventType["type"];
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  participantsExpected: string;
  color: string;
  cityId: string;
  demandIds: string[];
}

interface AgendaCreateModalProps {
  open: boolean;
  onClose: () => void;
  form: AgendaEventFormState;
  options: AgendaOptionsType;
  editingEventId: number | null;
  isSubmittingEvent: boolean;
  error: string | null;
  conflicts: Array<Record<string, unknown>>;
  onChange: (patch: Partial<AgendaEventFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formatDateTime: (value: string) => string;
}

const fallbackTypes = [
  { value: "meeting", label: "Reuniao" },
  { value: "audience", label: "Audiencia" },
  { value: "visit", label: "Visita" },
  { value: "session", label: "Sessao" },
  { value: "other", label: "Outro" },
];

export function AgendaCreateModal({
  open,
  onClose,
  form,
  options,
  editingEventId,
  isSubmittingEvent,
  error,
  conflicts,
  onChange,
  onSubmit,
  formatDateTime,
}: AgendaCreateModalProps) {
  const types = options.types.length > 0 ? options.types : fallbackTypes;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      headerBadge="Cadastro de evento"
      title={editingEventId ? "Editar evento" : "Novo evento"}
      subtitle="Registre compromissos com local, periodo, tipo e vinculos com cidade e demandas."
    >
      <div className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <Input
              label="Titulo"
              value={form.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Ex.: Reuniao com liderancas"
              required
            />
            <Select
              label="Tipo"
              value={form.type}
              onChange={(event) =>
                onChange({ type: event.target.value as EventType["type"] })
              }
              options={types}
            />
            <Input
              type="datetime-local"
              label="Inicio"
              value={form.startsAt}
              onChange={(event) => onChange({ startsAt: event.target.value })}
              required
            />
            <Input
              type="datetime-local"
              label="Termino"
              value={form.endsAt}
              onChange={(event) => onChange({ endsAt: event.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <Input
              label="Local"
              value={form.location}
              onChange={(event) => onChange({ location: event.target.value })}
              placeholder="Ex.: Assembleia Legislativa"
              required
            />
            <Select
              label="Cidade"
              value={form.cityId}
              onChange={(event) => onChange({ cityId: event.target.value })}
              options={[
                { value: "", label: "Sem cidade vinculada" },
                ...options.cities.map((city) => ({
                  value: city.id,
                  label: `${city.name} - ${city.region}`,
                })),
              ]}
            />
            <Input
              type="number"
              min="1"
              label="Participantes"
              value={form.participantsExpected}
              onChange={(event) =>
                onChange({ participantsExpected: event.target.value })
              }
              placeholder="Ex.: 20"
            />
            <Input
              type="color"
              label="Cor"
              value={form.color}
              onChange={(event) => onChange({ color: event.target.value })}
            />
          </div>

          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Detalhes do compromisso"
            rows={4}
            className="min-h-24"
          />

          <Select
            multiple
            className="min-h-44"
            label="Demandas vinculadas"
            value={form.demandIds}
            onChange={(event) => {
              const selectedValues = Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              );

              onChange({ demandIds: selectedValues });
            }}
          >
            {options.demands.map((demand) => (
              <option key={demand.id} value={demand.id}>
                {demand.title}
              </option>
            ))}
          </Select>

          {error ? <Alert tone="danger">{error}</Alert> : null}

          {conflicts.length > 0 ? (
            <Alert tone="danger" title="Conflitos encontrados:">
              <ul className="mt-2 space-y-2">
                {conflicts.map((conflict) => (
                  <li key={String(conflict.id)}>
                    {String(conflict.title)} -{" "}
                    {formatDateTime(String(conflict.starts_at))}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              type="submit"
              isLoading={isSubmittingEvent}
              loadingText="Salvando..."
            >
              {editingEventId ? "Atualizar evento" : "Criar evento"}
            </Button>
            <Button
              type="button"
              tone="neutral"
              variant="outline"
              onClick={onClose}
              disabled={isSubmittingEvent}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
