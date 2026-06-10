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

    public function searchCities(string $query, int $limit = 5): array
    {
        $normalizedQuery = mb_strtolower(trim($query));

        if ($normalizedQuery === '') {
            return [];
        }

        return City::query()
            ->where(function ($builder) use ($normalizedQuery) {
                $builder->whereRaw('LOWER(name) LIKE ?', ["{$normalizedQuery}%"])
                    ->orWhereRaw('LOWER(name) LIKE ?', ["% {$normalizedQuery}%"])
                    ->orWhereRaw('LOWER(name) LIKE ?', ["%{$normalizedQuery}%"]);
            })
            ->orderByRaw(
                "CASE
                    WHEN LOWER(name) LIKE ? THEN 0
                    WHEN LOWER(name) LIKE ? THEN 1
                    ELSE 2
                END",
                ["{$normalizedQuery}%", "% {$normalizedQuery}%"],
            )
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'region'])
            ->all();
    }

    public function institutionsByCity(int $cityId): array
    {
        return Institution::query()
            ->where('city_id', $cityId)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'city_id'])
            ->all();
    }

    public function create(array $data): Demand
    {
        $demandData = $data['demanda'];
        $citizen = Citizen::query()
            ->where('phone', $demandData['phone'])
            ->first();

        if (! $citizen) {
            $citizen = Citizen::query()->create([
                'name' => $demandData['citizen_name'],
                'cpf' => null,
                'birth_date' => null,
                'phone' => $demandData['phone'],
            ]);
        } else {
            $citizen->fill([
                'name' => $demandData['citizen_name'],
            ]);
            $citizen->save();
        }

        $canCreate = (bool) $data['can_create'];

        return $this->demandService->create([
            'title' => $demandData['title'],
            'description' => $demandData['description'],
            'service_area' => $demandData['service_area'] ?? null,
            'status' => $canCreate ? 'under_review' : 'discarded',
            'priority' => $demandData['priority'] ?? null,
            'responsible_user_id' => null,
            'city_id' => $demandData['city_id'],
            'institution_id' => $demandData['institution_id'] ?? null,
        ], null, $citizen->id, [
            'description' => $canCreate
                ? 'Demanda recebida via chatbot.'
                : 'Demanda descartada automaticamente pelo chatbot.',
            'metadata' => [
                'chatbot_validation' => [
                    'can_create' => $canCreate,
                    'reason' => $data['reason'] ?? null,
                    'message' => $data['message'] ?? null,
                    'skip_approval_flow' => ! $canCreate,
                ],
            ],
        ]);
    }

    public function status(int $id): array
    {
        return $this->demandService->findStatusById($id);
    }

    public function recentOpenDemands(int $cityId, int $months = 3): array
    {
        return Demand::query()
            ->where('city_id', $cityId)
            ->whereIn('status', Demand::ACTIVE_STATUSES)
            ->where('created_at', '>=', now()->subMonths($months))
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'description', 'status', 'created_at'])
            ->all();
    }
}
