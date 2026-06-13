<?php

namespace App\Services\Demand;

use App\Exceptions\ResourceNotFoundException;
use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Models\User;
use App\Support\DemandServiceAreas;
use App\Services\Notification\DemandAlertService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DemandService
{
    public function __construct(
        private readonly DemandHistoryService $demandHistoryService,
        private readonly DemandAlertService $demandAlertService,
    ) {
    }

    public function list(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = in_array($filters['status'] ?? null, Demand::STATUSES, true)
            ? $filters['status']
            : null;
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
            ->when(
                $status === null,
                fn ($query) => $query->where('status', '!=', 'discarded'),
            )
            ->when($status !== null, function ($query) use ($status) {
                $query->where('status', $status);
            })
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
        $oficio = $this->storeOficio($data['oficio'] ?? null);

        $demand = Demand::query()->create([
            'title' => $data['title'],
            'description' => $data['description'],
            'service_area' => $data['service_area'] ?? null,
            'status' => $data['status'],
            'discard_message' => $data['discard_message'] ?? null,
            'oficio_path' => $oficio['path'] ?? null,
            'oficio_original_name' => $oficio['original_name'] ?? null,
            'oficio_mime_type' => $oficio['mime_type'] ?? null,
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
            'oficio_original_name' => $demand->oficio_original_name,
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
            'oficio_original_name',
        ]);

        $oficioPath = $demand->getRawOriginal('oficio_path');
        $oficioOriginalName = $demand->oficio_original_name;
        $oficioMimeType = $demand->oficio_mime_type;

        if (($data['remove_oficio'] ?? false) && $oficioPath) {
            Storage::disk('public')->delete($oficioPath);
            $oficioPath = null;
            $oficioOriginalName = null;
            $oficioMimeType = null;
        }

        if (($data['oficio'] ?? null) instanceof UploadedFile) {
            if ($oficioPath) {
                Storage::disk('public')->delete($oficioPath);
            }

            $storedOficio = $this->storeOficio($data['oficio']);
            $oficioPath = $storedOficio['path'];
            $oficioOriginalName = $storedOficio['original_name'];
            $oficioMimeType = $storedOficio['mime_type'];
        }

        $demand->update([
            'title' => $data['title'],
            'description' => $data['description'],
            'service_area' => $data['service_area'] ?? null,
            'status' => $data['status'],
            'oficio_path' => $oficioPath,
            'oficio_original_name' => $oficioOriginalName,
            'oficio_mime_type' => $oficioMimeType,
            'priority' => $data['priority'],
            'responsible_user_id' => $data['responsible_user_id'] ?? null,
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
        ]);

        $changes = $this->registerUpdateHistory(
            $demand,
            $original,
            array_merge($data, [
                'oficio_original_name' => $oficioOriginalName,
            ]),
            $authenticatedUserId,
        );

        $this->demandAlertService->createDemandUpdatedAlerts(
            $this->findById($demand->id),
            $changes,
        );

        return $this->findById($demand->id);
    }

    public function delete(int $id, ?int $authenticatedUserId): void
    {
        $demand = Demand::query()->findOrFail($id);

        if ($demand->getRawOriginal('oficio_path')) {
            Storage::disk('public')->delete($demand->getRawOriginal('oficio_path'));
        }

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

    public function downloadOficio(int $id): StreamedResponse
    {
        $demand = Demand::query()->findOrFail($id);
        $oficioPath = $demand->getRawOriginal('oficio_path');

        if (! $oficioPath || ! Storage::disk('public')->exists($oficioPath)) {
            throw new ResourceNotFoundException('Oficio');
        }

        return Storage::disk('public')->download(
            $oficioPath,
            $demand->oficio_original_name ?? basename($oficioPath),
        );
    }

    public function options(?User $user = null): array
    {
        $usersQuery = User::query()->orderBy('name');

        if ($user && ! $user->hasPermission(\App\Support\PermissionCodes::DEMANDS_MANAGE)) {
            $usersQuery->where('id', $user->id);
        }

        return [
            'users' => $usersQuery
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
    ): array {
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
            'oficio_original_name',
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

        return $changes;
    }

    /**
     * @return array{path: string, original_name: string, mime_type: string|null}|null
     */
    private function storeOficio(?UploadedFile $oficio): ?array
    {
        if (! $oficio) {
            return null;
        }

        return [
            'path' => $oficio->store('demands/oficios', 'public'),
            'original_name' => $oficio->getClientOriginalName(),
            'mime_type' => $oficio->getClientMimeType(),
        ];
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
