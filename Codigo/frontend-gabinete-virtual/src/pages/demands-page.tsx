import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createDemand,
  getDemandOptions,
  listDemands,
  removeDemand,
  toApiError,
  updateDemand,
} from "../lib/demand-api";
import type {
  DemandOptionsType,
  ManagedDemandType,
} from "../types/demand/managed-demand-type";

interface DemandFormState {
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  responsibleUserId: string;
  cityId: string;
  institutionId: string;
}

const EMPTY_FORM: DemandFormState = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  responsibleUserId: "",
  cityId: "",
  institutionId: "",
};

export function DemandsPage() {
  const perPage = 10;
  const [demands, setDemands] = useState<ManagedDemandType[]>([]);
  const [options, setOptions] = useState<DemandOptionsType>({
    users: [],
    cities: [],
    institutions: [],
  });
  const [editingDemandId, setEditingDemandId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalDemands, setTotalDemands] = useState(0);
  const [form, setForm] = useState<DemandFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDemands(1, perPage), getDemandOptions()])
      .then(([demandsResponse, optionsResponse]) => {
        setDemands(demandsResponse.data);
        setCurrentPage(demandsResponse.meta.current_page);
        setLastPage(demandsResponse.meta.last_page);
        setTotalDemands(demandsResponse.meta.total);
        setOptions(optionsResponse);
      })
      .catch((requestError) => {
        setError(
          toApiError(requestError, "Nao foi possivel carregar as demandas."),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!form.cityId) {
      return options.institutions;
    }

    return options.institutions.filter(
      (institution) => institution.city_id === Number(form.cityId),
    );
  }, [form.cityId, options.institutions]);

  function handleResetForm() {
    setEditingDemandId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function handleSelectDemand(demand: ManagedDemandType) {
    setEditingDemandId(demand.id);
    setForm({
      title: demand.title,
      description: demand.description,
      status: demand.status,
      priority: demand.priority,
      responsibleUserId: String(demand.responsible_user_id),
      cityId: String(demand.city_id),
      institutionId: String(demand.institution_id),
    });
    setError(null);
    setSuccess(null);
  }

  async function refreshDemands(page = currentPage) {
    const response = await listDemands(page, perPage);
    setDemands(response.data);
    setCurrentPage(response.meta.current_page);
    setLastPage(response.meta.last_page);
    setTotalDemands(response.meta.total);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.responsibleUserId || !form.cityId || !form.institutionId) {
        setError("Selecione usuario responsavel, cidade e instituicao.");
        return;
      }

      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        responsible_user_id: Number(form.responsibleUserId),
        city_id: Number(form.cityId),
        institution_id: Number(form.institutionId),
      };

      if (editingDemandId) {
        await updateDemand(editingDemandId, payload);
        setSuccess("Demanda atualizada com sucesso.");
      } else {
        await createDemand(payload);
        setSuccess("Demanda criada com sucesso.");
      }

      await refreshDemands(editingDemandId ? currentPage : 1);
      handleResetForm();
    } catch (submissionError) {
      setError(
        toApiError(submissionError, "Nao foi possivel salvar a demanda."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(demand: ManagedDemandType) {
    const shouldDelete = window.confirm(
      `Deseja remover a demanda \"${demand.title}\"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeDemand(demand.id);
      const targetPage = demands.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

      await refreshDemands(targetPage);
      if (editingDemandId === demand.id) {
        handleResetForm();
      }
      setSuccess("Demanda removida com sucesso.");
    } catch (deleteError) {
      setError(
        toApiError(deleteError, "Nao foi possivel remover a demanda."),
      );
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6">
        <section className="card-surface rounded-[32px] p-8">
          <p className="text-sm leading-7 text-muted">Carregando demandas...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Cadastro de demandas
        </p>
        <h2 className="section-title mt-4 text-4xl font-semibold text-foreground">
          Gestão de demandas
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Crie, edite e remova demandas com status, prioridade e responsavel.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Titulo</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Titulo da demanda"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Descricao</span>
            <input
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Descricao da demanda"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as DemandFormState["status"],
                  }))
                }
              >
                <option value="open">Aberta</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Concluida</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Prioridade</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as DemandFormState["priority"],
                  }))
                }
              >
                <option value="low">Baixa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Usuario responsavel
            </span>
            <select
              value={form.responsibleUserId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  responsibleUserId: event.target.value,
                }))
              }
              required
            >
              <option value="">Selecione o responsavel</option>
              {options.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Cidade</span>
            <select
              value={form.cityId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cityId: event.target.value,
                  institutionId: "",
                }))
              }
              required
            >
              <option value="">Selecione a cidade</option>
              {options.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.region})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Instituicao</span>
            <select
              value={form.institutionId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  institutionId: event.target.value,
                }))
              }
              required
            >
              <option value="">Selecione a instituicao</option>
              {filteredInstitutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name} ({institution.type})
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-strong">
              {success}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Salvando..."
                : editingDemandId
                  ? "Atualizar demanda"
                  : "Criar demanda"}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              disabled={isSubmitting}
              className="rounded-2xl border border-border bg-surface-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              Limpar formulario
            </button>
          </div>
        </form>
      </section>

      <section className="card-surface rounded-[32px] p-8">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          Demandas cadastradas
        </p>
        <div className="mt-6 grid gap-4">
          {demands.length > 0 ? (
            demands.map((demand) => (
              <article
                key={demand.id}
                className="rounded-3xl border border-border bg-surface-strong p-5"
              >
                <h3 className="text-lg font-semibold text-foreground">{demand.title}</h3>
                <p className="mt-1 text-sm leading-7 text-muted">{demand.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {demand.status}
                  </span>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {demand.priority}
                  </span>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                    {demand.user?.name ?? "Sem responsavel"}
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDemand(demand)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background-strong"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(demand)}
                    className="rounded-xl border border-danger/35 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15"
                  >
                    Excluir
                  </button>
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
              <button
                type="button"
                onClick={() => refreshDemands(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} de {lastPage}
              </span>
              <button
                type="button"
                onClick={() => refreshDemands(currentPage + 1)}
                disabled={currentPage >= lastPage}
                className="rounded-lg border border-border bg-surface-strong px-3 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Proxima
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
