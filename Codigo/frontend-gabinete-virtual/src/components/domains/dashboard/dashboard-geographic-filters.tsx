import type { FormEvent } from "react";
import type { DashboardOverviewType } from "../../../types/dashboard/dashboard-overview-type";
import { Button, Card, Select } from "../../core";
import { LogoutButton } from "../../app/logout-button";

export interface DashboardFiltersState {
  region: string;
  cityId: string;
}

interface DashboardGeographicFiltersProps {
  dashboard: DashboardOverviewType;
  filters: DashboardFiltersState;
  filteredCities: DashboardOverviewType["options"]["cities"];
  isRefreshing: boolean;
  onChangeFilters: (updater: DashboardFiltersState | ((current: DashboardFiltersState) => DashboardFiltersState)) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void | Promise<void>;
}

export function DashboardGeographicFilters({
  dashboard,
  filters,
  filteredCities,
  isRefreshing,
  onChangeFilters,
  onSubmit,
  onClear,
}: DashboardGeographicFiltersProps) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
            Filtros geograficos
          </p>
          <h3 className="section-title mt-4 text-3xl font-semibold text-foreground">
            Monte o recorte da visita
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Filtre por região e cidade para ver demandas, emendas, agenda e
            instituições associadas ao território analisado.
          </p>
        </div>
        <LogoutButton />
      </div>

      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Select
          label="Regiao"
          value={filters.region}
          onChange={(event) =>
            onChangeFilters((current) => {
              const nextRegion = event.target.value;
              const selectedCityStillValid = dashboard.options.cities.some(
                (city) =>
                  String(city.id) === current.cityId &&
                  (nextRegion === "" || city.region === nextRegion),
              );

              return {
                region: nextRegion,
                cityId: selectedCityStillValid ? current.cityId : "",
              };
            })
          }
          options={[
            { value: "", label: "Todas as regioes" },
            ...dashboard.options.regions.map((region) => ({
              value: region,
              label: region,
            })),
          ]}
        />

        <Select
          label="Cidade"
          value={filters.cityId}
          onChange={(event) =>
            onChangeFilters((current) => ({
              ...current,
              cityId: event.target.value,
            }))
          }
          options={[
            { value: "", label: "Todas as cidades" },
            ...filteredCities.map((city) => ({
              value: city.id,
              label: `${city.name} (${city.region})`,
            })),
          ]}
        />

        <div className="mt-2 flex flex-wrap gap-3">
          <Button type="submit" isLoading={isRefreshing} loadingText="Atualizando...">
            Aplicar recorte
          </Button>
          <Button
            type="button"
            tone="neutral"
            variant="outline"
            onClick={() => void onClear()}
            disabled={isRefreshing}
          >
            Limpar
          </Button>
        </div>
      </form>
    </Card>
  );
}
