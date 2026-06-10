<?php

namespace App\Services\Demand;

use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Models\User;
use App\Support\DemandServiceAreas;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DemandService
{
    public function __construct(private readonly DemandHistoryService $demandHistoryService)
    {
    }

    public function list(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $responsibleUserId = $filters['responsible_user_id'] ?? null;
        $cityId = $filters['city_id'] ?? null;
        $region = trim((string) ($filters['region'] ?? ''));
        $serviceArea = $filters['service_area'] ?? null;
        $sortBy = in_array($filters['sort_by'] ?? null, ['title', 'created_at', 'service_area'], true)
            ? $filters['sort_by']
            : 'created_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'desc';

        return Demand::query()
            ->with([
                'user:id,name,email',
                'city:id,name,region',
                'institution:id,name,type,city_id',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('service_area', 'like', "%{$search}%");
                });
            })
            ->when($responsibleUserId, function ($query) use ($responsibleUserId) {
                $query->where('responsible_user_id', $responsibleUserId);
            })
            ->when($cityId, function ($query) use ($cityId) {
                $query->where('city_id', $cityId);
            })
            ->when($region !== '', function ($query) use ($region) {
                $query->whereHas('city', function ($cityQuery) use ($region) {
                    $cityQuery->where('region', $region);
                });
            })
            ->when($serviceArea, function ($query) use ($serviceArea) {
                $query->where('service_area', $serviceArea);
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findById(int $id): Demand
    {
        return Demand::query()
            ->with([
                'user:id,name,email',
                'city:id,name,region',
                'institution:id,name,type,city_id',
            ])
            ->findOrFail($id);
    }

    public function findStatusById(int $id): array
    {
        $demand = Demand::query()
            ->select(['id', 'title', 'status', 'priority', 'updated_at'])
            ->findOrFail($id);

        return [
            'id' => $demand->id,
            'title' => $demand->title,
            'status' => $demand->status,
            'status_label' => $this->translateStatus($demand->status),
            'priority' => $demand->priority,
            'updated_at' => $demand->updated_at,
        ];
    }

    public function create(
        array $data,
        ?int $authenticatedUserId,
        ?int $createdByCitizenId = null,
        array $historyContext = [],
    ): Demand
    {
        $demand = Demand::query()->create([
            'title' => $data['title'],
            'description' => $data['description'],
            'service_area' => $data['service_area'] ?? null,
            'status' => $data['status'],
            'priority' => $data['priority'],
            'responsible_user_id' => $data['responsible_user_id'] ?? null,
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
            'created_by_user_id' => $authenticatedUserId,
            'created_by_citizen_id' => $createdByCitizenId,
        ]);

        $historyMetadata = [
            'status' => $demand->status,
            'service_area' => $demand->service_area,
            'priority' => $demand->priority,
            'responsible_user_id' => $demand->responsible_user_id,
            'created_by_citizen_id' => $demand->created_by_citizen_id,
        ];

        if (isset($historyContext['metadata']) && is_array($historyContext['metadata'])) {
            $historyMetadata = array_merge($historyMetadata, $historyContext['metadata']);
        }

        $this->demandHistoryService->logDemandChange(
            $demand->id,
            $authenticatedUserId,
            'created',
            $historyContext['description'] ?? 'Demanda criada.',
            $historyMetadata,
        );

        return $this->findById($demand->id);
    }

    public function update(int $id, array $data, ?int $authenticatedUserId): Demand
    {
        $demand = Demand::query()->findOrFail($id);
        $original = $demand->only([
            'title',
            'description',
            'service_area',
            'status',
            'priority',
            'responsible_user_id',
            'city_id',
            'institution_id',
        ]);

        $demand->update([
            'title' => $data['title'],
            'description' => $data['description'],
            'service_area' => $data['service_area'] ?? null,
            'status' => $data['status'],
            'priority' => $data['priority'],
            'responsible_user_id' => $data['responsible_user_id'] ?? null,
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
        ]);

        $this->registerUpdateHistory($demand, $original, $data, $authenticatedUserId);

        return $this->findById($demand->id);
    }

    public function delete(int $id, ?int $authenticatedUserId): void
    {
        $demand = Demand::query()->findOrFail($id);

        $this->demandHistoryService->logDemandChange(
            $demand->id,
            $authenticatedUserId,
            'deleted',
            'Demanda removida.',
            [
                'title' => $demand->title,
                'status' => $demand->status,
            ],
        );

        $demand->delete();
    }

    public function options(): array
    {
        return [
            'users' => User::query()
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'region']),
            'institutions' => Institution::query()
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'city_id']),
            'service_areas' => DemandServiceAreas::options(),
        ];
    }

    private function registerUpdateHistory(
        Demand $demand,
        array $original,
        array $updated,
        ?int $authenticatedUserId,
    ): void {
        $changes = [];

        foreach ([
            'title',
            'description',
            'service_area',
            'status',
            'priority',
            'responsible_user_id',
            'city_id',
            'institution_id',
        ] as $field) {
            if (($original[$field] ?? null) !== ($updated[$field] ?? null)) {
                $changes[$field] = [
                    'from' => $original[$field] ?? null,
                    'to' => $updated[$field] ?? null,
                ];
            }
        }

        if ($changes !== []) {
            $this->demandHistoryService->logDemandChange(
                $demand->id,
                $authenticatedUserId,
                'updated',
                'Demanda atualizada.',
                $changes,
            );
        }
    }

    private function translateStatus(string $status): string
    {
        return match ($status) {
            'open' => 'Aberta',
            'under_review' => 'Em análise',
            'in_progress' => 'Em andamento',
            'completed' => 'Concluída',
            'discarded' => 'Descartada',
            default => $status,
        };
    }
}
