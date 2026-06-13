<?php

namespace App\Services\Amendment;

use App\Models\Amendment;
use App\Models\City;
use App\Support\AmendmentApplicationAreas;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AmendmentService
{
    public function list(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = $filters['status'] ?? null;
        $cityId = $filters['city_id'] ?? null;
        $applicationArea = $filters['application_area'] ?? null;
        $sortBy = in_array($filters['sort_by'] ?? null, ['number', 'amount', 'created_at'], true)
            ? $filters['sort_by']
            : 'created_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'desc';

        return Amendment::query()
            ->with('city:id,name,region')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('number', 'like', "%{$search}%")
                        ->orWhere('application_area', 'like', "%{$search}%");
                });
            })
            ->when($status, function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->when($cityId, function ($query) use ($cityId) {
                $query->where('city_id', $cityId);
            })
            ->when($applicationArea, function ($query) use ($applicationArea) {
                $query->where('application_area', $applicationArea);
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function options(): array
    {
        return [
            'statuses' => $this->statusOptions(),
            'application_areas' => AmendmentApplicationAreas::options(),
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'region']),
        ];
    }

    public function findById(int $id): Amendment
    {
        return Amendment::query()
            ->with('city:id,name,region')
            ->findOrFail($id);
    }

    public function create(array $data): Amendment
    {
        $amendment = Amendment::query()->create([
            'number' => $data['number'],
            'amount' => $data['amount'],
            'status' => $data['status'],
            'city_id' => $data['city_id'],
            'application_area' => $data['application_area'],
        ]);

        return $this->findById($amendment->id);
    }

    public function update(int $id, array $data): Amendment
    {
        $amendment = Amendment::query()->findOrFail($id);

        $amendment->update([
            'number' => $data['number'],
            'amount' => $data['amount'],
            'status' => $data['status'],
            'city_id' => $data['city_id'],
            'application_area' => $data['application_area'],
        ]);

        return $this->findById($amendment->id);
    }

    public function updateStatus(int $id, string $status): Amendment
    {
        $amendment = Amendment::query()->findOrFail($id);

        $amendment->update([
            'status' => $status,
        ]);

        return $this->findById($amendment->id);
    }

    public function delete(int $id): void
    {
        $amendment = Amendment::query()->findOrFail($id);
        $amendment->delete();
    }

    private function statusOptions(): array
    {
        return [
            ['value' => 'planned', 'label' => 'Planejada'],
            ['value' => 'in_execution', 'label' => 'Em execução'],
            ['value' => 'completed', 'label' => 'Concluída'],
        ];
    }
}
