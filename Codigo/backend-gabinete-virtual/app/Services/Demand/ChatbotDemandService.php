<?php

namespace App\Services\Demand;

use App\Models\Citizen;
use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Support\DemandServiceAreas;

class ChatbotDemandService
{
    public function __construct(private readonly DemandService $demandService)
    {
    }

    public function options(): array
    {
        return [
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'region']),
            'institutions' => Institution::query()
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'city_id']),
            'service_areas' => DemandServiceAreas::options(),
        ];
    }

    public function create(array $data): Demand
    {
        $citizen = Citizen::query()
            ->where('phone', $data['phone'])
            ->first();

        if (! $citizen) {
            $citizen = Citizen::query()->create([
                'name' => $data['citizen_name'],
                'cpf' => null,
                'birth_date' => null,
                'phone' => $data['phone'],
            ]);
        } else {
            $citizen->fill([
                'name' => $data['citizen_name'],
            ]);
            $citizen->save();
        }

        return $this->demandService->create([
            'title' => $data['title'],
            'description' => $data['description'],
            'service_area' => $data['service_area'] ?? null,
            'status' => 'under_review',
            'priority' => $data['priority'] ?? null,
            'responsible_user_id' => null,
            'city_id' => $data['city_id'],
            'institution_id' => $data['institution_id'],
        ], null, $citizen->id);
    }

    public function status(int $id): array
    {
        return $this->demandService->findStatusById($id);
    }
}
