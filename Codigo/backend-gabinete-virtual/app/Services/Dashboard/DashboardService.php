<?php

namespace App\Services\Dashboard;

use App\Models\Amendment;
use App\Models\City;
use App\Models\Demand;
use App\Models\DemandHistory;
use App\Models\Event;
use App\Models\Institution;
use App\Models\ProjectLaw;
use App\Support\DemandServiceAreas;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class DashboardService
{
    public function overview(array $filters = []): array
    {
        $normalizedFilters = $this->normalizeFilters($filters);
        $cities = $this->availableCities();

        return [
            'filters' => $normalizedFilters,
            'scope' => $this->scope($cities, $normalizedFilters),
            'options' => $this->options($cities),
            'summary' => $this->summary($normalizedFilters),
            'charts' => [
                'demands_by_status' => $this->demandsByStatusChart($normalizedFilters),
                'demands_by_service_area' => $this->demandsByServiceAreaChart($normalizedFilters),
                'demands_by_city' => $this->demandsByCityChart($normalizedFilters),
                'amendments_by_city' => $this->amendmentsByCityChart($normalizedFilters),
            ],
            'recent_activities' => $this->recentActivities($normalizedFilters),
            'generated_at' => now()->toISOString(),
        ];
    }

    private function normalizeFilters(array $filters): array
    {
        return [
            'city_id' => isset($filters['city_id']) ? (int) $filters['city_id'] : null,
            'region' => trim((string) ($filters['region'] ?? '')) ?: null,
        ];
    }

    private function availableCities(): Collection
    {
        return City::query()
            ->orderBy('region')
            ->orderBy('name')
            ->get(['id', 'name', 'region']);
    }

    private function options(Collection $cities): array
    {
        return [
            'regions' => $cities
                ->pluck('region')
                ->filter(fn (?string $region) => filled($region))
                ->unique()
                ->values()
                ->all(),
            'cities' => $cities
                ->map(fn (City $city) => [
                    'id' => $city->id,
                    'name' => $city->name,
                    'region' => $city->region,
                ])
                ->values()
                ->all(),
            'demand_service_areas' => DemandServiceAreas::options(),
        ];
    }

    private function scope(Collection $cities, array $filters): array
    {
        $selectedCity = $filters['city_id']
            ? $cities->firstWhere('id', $filters['city_id'])
            : null;

        if ($selectedCity instanceof City) {
            return [
                'label' => $selectedCity->name,
                'description' => 'Recorte da cidade selecionada em '.$selectedCity->region.'.',
            ];
        }

        if ($filters['region']) {
            return [
                'label' => $filters['region'],
                'description' => 'Recorte consolidado da região selecionada.',
            ];
        }

        return [
            'label' => 'Visão geral',
            'description' => 'Consolidação estadual para apoiar o planejamento das visitas e decisões do gabinete.',
        ];
    }

    private function summary(array $filters): array
    {
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $demandsQuery = $this->filteredDemandQuery($filters);
        $totalDemands = (clone $demandsQuery)->count();
        $completedDemands = (clone $demandsQuery)
            ->where('status', 'completed')
            ->count();

        $amendmentsQuery = $this->filteredAmendmentQuery($filters);

        return [
            'active_demands' => (clone $demandsQuery)
                ->whereIn('status', ['open', 'under_review', 'in_progress'])
                ->count(),
            'completed_demands' => $completedDemands,
            'project_laws_total' => ProjectLaw::query()->count(),
            'amendments' => (clone $amendmentsQuery)->count(),
            'amendment_amount_total' => round((float) (clone $amendmentsQuery)->sum('amount'), 2),
            'events_this_month' => $this->filteredEventQuery($filters)
                ->where(function (Builder $query) use ($monthStart, $monthEnd) {
                    $query->whereBetween('starts_at', [$monthStart, $monthEnd])
                        ->orWhere(function (Builder $subQuery) use ($monthStart, $monthEnd) {
                            $subQuery->whereNull('starts_at')
                                ->whereBetween('event_at', [$monthStart, $monthEnd]);
                        });
                })
                ->count(),
            'institutions' => $this->filteredInstitutionQuery($filters)->count(),
            'resolution_rate' => $totalDemands > 0
                ? (int) round(($completedDemands / $totalDemands) * 100)
                : 0,
        ];
    }

    private function demandsByStatusChart(array $filters): array
    {
        return $this->filteredDemandQuery($filters)
            ->get(['id', 'status'])
            ->groupBy('status')
            ->map(function (Collection $items, string $status) {
                return [
                    'key' => $status,
                    'label' => $this->translateDemandStatus($status),
                    'value' => $items->count(),
                ];
            })
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    private function demandsByServiceAreaChart(array $filters): array
    {
        return $this->filteredDemandQuery($filters)
            ->get(['id', 'service_area'])
            ->groupBy(fn (Demand $demand) => $demand->service_area ?? 'unknown')
            ->map(function (Collection $items, string $serviceArea) {
                return [
                    'key' => $serviceArea,
                    'label' => $serviceArea === 'unknown'
                        ? 'Não informada'
                        : DemandServiceAreas::label($serviceArea),
                    'value' => $items->count(),
                ];
            })
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    private function demandsByCityChart(array $filters): array
    {
        return $this->filteredDemandQuery($filters)
            ->with('city:id,name,region')
            ->get(['id', 'city_id'])
            ->groupBy('city_id')
            ->map(function (Collection $items, int|string $cityId) {
                /** @var Demand $firstDemand */
                $firstDemand = $items->first();
                $city = $firstDemand->city;

                return [
                    'key' => (string) $cityId,
                    'label' => $city?->name ?? 'Não informada',
                    'value' => $items->count(),
                    'description' => $city?->region,
                ];
            })
            ->sortByDesc('value')
            ->take(7)
            ->values()
            ->all();
    }

    private function amendmentsByCityChart(array $filters): array
    {
        return $this->filteredAmendmentQuery($filters)
            ->with('city:id,name,region')
            ->get(['id', 'city_id', 'amount'])
            ->groupBy('city_id')
            ->map(function (Collection $items, int|string $cityId) {
                /** @var Amendment $firstAmendment */
                $firstAmendment = $items->first();
                $city = $firstAmendment->city;

                return [
                    'key' => (string) $cityId,
                    'label' => $city?->name ?? 'Não informada',
                    'value' => $items->count(),
                    'amount_total' => round((float) $items->sum('amount'), 2),
                    'description' => $city?->region,
                ];
            })
            ->sortByDesc('amount_total')
            ->take(7)
            ->values()
            ->all();
    }

    private function recentActivities(array $filters): array
    {
        $activities = collect()
            ->concat($this->recentDemandActivities($filters))
            ->concat($this->recentAmendmentActivities($filters))
            ->concat($this->recentEventActivities($filters));

        if (! $this->hasGeographicFilters($filters)) {
            $activities = $activities->concat($this->recentProjectLawActivities());
        }

        return $activities
            ->sortByDesc(fn (array $activity) => strtotime($activity['occurred_at']))
            ->take(8)
            ->values()
            ->all();
    }

    private function recentDemandActivities(array $filters): Collection
    {
        return DemandHistory::query()
            ->with('demand:id,title,status,service_area,city_id')
            ->whereHas('demand', function (Builder $query) use ($filters) {
                $this->applyGeographicFilters($query, $filters, 'demands');
            })
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (DemandHistory $history) => $this->mapDemandActivity($history));
    }

    private function recentProjectLawActivities(): Collection
    {
        return ProjectLaw::query()
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get(['id', 'number', 'status', 'created_at', 'updated_at'])
            ->map(function (ProjectLaw $projectLaw) {
                $isUpdated = $this->wasUpdatedAfterCreation(
                    $projectLaw->created_at,
                    $projectLaw->updated_at,
                );

                return [
                    'id' => "project-law-{$projectLaw->id}",
                    'type' => 'project_law',
                    'title' => $isUpdated
                        ? "Projeto de lei atualizado: {$projectLaw->number}"
                        : "Projeto de lei cadastrado: {$projectLaw->number}",
                    'description' => 'Status atual: '.$this->translateProjectLawStatus($projectLaw->status),
                    'occurred_at' => optional($projectLaw->updated_at)->toISOString(),
                    'link' => '/painel/projetos-de-lei',
                ];
            });
    }

    private function recentAmendmentActivities(array $filters): Collection
    {
        return $this->filteredAmendmentQuery($filters)
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get(['id', 'number', 'status', 'created_at', 'updated_at'])
            ->map(function (Amendment $amendment) {
                $isUpdated = $this->wasUpdatedAfterCreation(
                    $amendment->created_at,
                    $amendment->updated_at,
                );

                return [
                    'id' => "amendment-{$amendment->id}",
                    'type' => 'amendment',
                    'title' => $isUpdated
                        ? "Emenda atualizada: {$amendment->number}"
                        : "Emenda cadastrada: {$amendment->number}",
                    'description' => 'Status atual: '.$this->translateAmendmentStatus($amendment->status),
                    'occurred_at' => optional($amendment->updated_at)->toISOString(),
                    'link' => '/painel/emendas',
                ];
            });
    }

    private function recentEventActivities(array $filters): Collection
    {
        return $this->filteredEventQuery($filters)
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get(['id', 'title', 'type', 'location', 'created_at', 'updated_at'])
            ->map(function (Event $event) {
                $isUpdated = $this->wasUpdatedAfterCreation(
                    $event->created_at,
                    $event->updated_at,
                );

                return [
                    'id' => "event-{$event->id}",
                    'type' => 'event',
                    'title' => $isUpdated
                        ? "Evento atualizado: {$event->title}"
                        : "Evento agendado: {$event->title}",
                    'description' => $this->translateEventType($event->type).' em '.$event->location,
                    'occurred_at' => optional($event->updated_at)->toISOString(),
                    'link' => '/painel/agenda',
                ];
            });
    }

    private function mapDemandActivity(DemandHistory $history): array
    {
        $demandTitle = $history->demand?->title ?? 'Demanda';
        $metadata = is_array($history->metadata) ? $history->metadata : [];

        return [
            'id' => "demand-history-{$history->id}",
            'type' => 'demand',
            'title' => $this->resolveDemandActivityTitle($history->action, $demandTitle),
            'description' => $this->resolveDemandActivityDescription($history->action, $metadata, $history->description),
            'occurred_at' => optional($history->created_at)->toISOString(),
            'link' => '/painel/demandas',
        ];
    }

    private function resolveDemandActivityTitle(string $action, string $demandTitle): string
    {
        return match ($action) {
            'created' => "Nova demanda: {$demandTitle}",
            'deleted' => "Demanda removida: {$demandTitle}",
            default => "Demanda atualizada: {$demandTitle}",
        };
    }

    private function resolveDemandActivityDescription(
        string $action,
        array $metadata,
        string $fallbackDescription,
    ): string {
        if ($action === 'created') {
            $serviceArea = $metadata['service_area'] ?? null;

            if (is_string($serviceArea) && $serviceArea !== '') {
                return 'Área atendida: '.DemandServiceAreas::label($serviceArea);
            }

            $status = $metadata['status'] ?? null;

            return $status
                ? 'Status inicial: '.$this->translateDemandStatus((string) $status)
                : $fallbackDescription;
        }

        $statusChange = $metadata['status'] ?? null;

        if (is_array($statusChange) && array_key_exists('to', $statusChange)) {
            return 'Novo status: '.$this->translateDemandStatus((string) $statusChange['to']);
        }

        $serviceAreaChange = $metadata['service_area'] ?? null;

        if (is_array($serviceAreaChange) && array_key_exists('to', $serviceAreaChange)) {
            return 'Área atendida: '.DemandServiceAreas::label((string) $serviceAreaChange['to']);
        }

        $responsibleChange = $metadata['responsible_user_id'] ?? null;

        if (is_array($responsibleChange) && array_key_exists('to', $responsibleChange)) {
            return 'Responsável da demanda atualizado.';
        }

        return $fallbackDescription;
    }

    private function filteredDemandQuery(array $filters): Builder
    {
        $query = Demand::query();
        $this->applyGeographicFilters($query, $filters, 'demands');

        return $query;
    }

    private function filteredAmendmentQuery(array $filters): Builder
    {
        $query = Amendment::query();
        $this->applyGeographicFilters($query, $filters, 'amendments');

        return $query;
    }

    private function filteredEventQuery(array $filters): Builder
    {
        $query = Event::query();
        $this->applyGeographicFilters($query, $filters, 'events');

        return $query;
    }

    private function filteredInstitutionQuery(array $filters): Builder
    {
        $query = Institution::query();
        $this->applyGeographicFilters($query, $filters, 'institutions');

        return $query;
    }

    private function applyGeographicFilters(Builder $query, array $filters, string $table): void
    {
        if ($filters['city_id']) {
            $query->where("{$table}.city_id", $filters['city_id']);
        }

        if ($filters['region']) {
            $query->whereHas('city', function (Builder $cityQuery) use ($filters) {
                $cityQuery->where('region', $filters['region']);
            });
        }
    }

    private function hasGeographicFilters(array $filters): bool
    {
        return (bool) ($filters['city_id'] || $filters['region']);
    }

    private function translateDemandStatus(string $status): string
    {
        return match ($status) {
            'open' => 'Aberta',
            'under_review' => 'Em análise',
            'in_progress' => 'Em andamento',
            'completed' => 'Concluída',
            default => $status,
        };
    }

    private function translateProjectLawStatus(string $status): string
    {
        return match ($status) {
            'in_committee' => 'Em comissão',
            'in_voting' => 'Em votação',
            'approved' => 'Aprovado',
            'sanctioned' => 'Sancionado',
            default => $status,
        };
    }

    private function translateAmendmentStatus(string $status): string
    {
        return match ($status) {
            'planned' => 'Planejada',
            'in_execution' => 'Em execução',
            'completed' => 'Concluída',
            default => $status,
        };
    }

    private function translateEventType(string $type): string
    {
        return match ($type) {
            'meeting' => 'Reunião',
            'audience' => 'Audiência',
            'visit' => 'Visita',
            'session' => 'Sessão',
            default => 'Evento',
        };
    }

    private function wasUpdatedAfterCreation(?Carbon $createdAt, ?Carbon $updatedAt): bool
    {
        if (! $createdAt || ! $updatedAt) {
            return false;
        }

        return ! $createdAt->equalTo($updatedAt);
    }
}
