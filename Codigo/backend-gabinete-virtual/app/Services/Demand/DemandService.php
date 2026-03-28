<?php

namespace App\Services\Demand;

use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DemandService
{
    public function list(int $perPage = 10): LengthAwarePaginator
    {
        return Demand::query()
            ->with([
                'user:id,name,email',
                'city:id,name,region',
                'institution:id,name,type,city_id',
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);
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

    public function create(array $data, ?int $authenticatedUserId): Demand
    {
        $demand = Demand::query()->create([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'responsible_user_id' => $data['responsible_user_id'],
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
            'created_by_user_id' => $authenticatedUserId,
            'created_by_citizen_id' => null,
        ]);

        return $this->findById($demand->id);
    }

    public function update(int $id, array $data): Demand
    {
        $demand = Demand::query()->findOrFail($id);

        $demand->update([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'responsible_user_id' => $data['responsible_user_id'],
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
        ]);

        return $this->findById($demand->id);
    }

    public function delete(int $id): void
    {
        $demand = Demand::query()->findOrFail($id);

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
        ];
    }
}
