<?php

namespace App\Services\Demand;

use App\Models\Citizen;
use App\Models\CitizenPhone;
use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Support\DemandServiceAreas;
use Illuminate\Support\Facades\DB;

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

    public function findCitizenByPhone(string $phone): ?array
    {
        $normalizedPhone = $this->normalizePhone($phone);

        if ($normalizedPhone === '') {
            return null;
        }

        $citizenPhone = CitizenPhone::query()
            ->with('citizen')
            ->where('normalized_phone', $normalizedPhone)
            ->first();

        if (! $citizenPhone || ! $citizenPhone->citizen) {
            return null;
        }

        return $this->formatCitizen($citizenPhone->citizen, $citizenPhone);
    }

    public function registerCitizen(array $data): array
    {
        $normalizedPhone = $this->normalizePhone($data['phone']);

        return DB::transaction(function () use ($data, $normalizedPhone) {
            $citizenPhone = CitizenPhone::query()
                ->with('citizen')
                ->lockForUpdate()
                ->where('normalized_phone', $normalizedPhone)
                ->first();

            $citizen = $citizenPhone?->citizen;

            if (! $citizen) {
                $citizen = Citizen::query()->create([
                    'name' => $data['name'],
                    'cpf' => null,
                    'birth_date' => null,
                    'phone' => $data['phone'],
                    'receive_demand_updates' => (bool) $data['receive_demand_updates'],
                ]);

                $citizenPhone = CitizenPhone::query()->create([
                    'citizen_id' => $citizen->id,
                    'phone' => $data['phone'],
                    'normalized_phone' => $normalizedPhone,
                ]);
            } else {
                $citizen->fill([
                    'name' => $data['name'],
                    'receive_demand_updates' => (bool) $data['receive_demand_updates'],
                    'phone' => $data['phone'],
                ]);
                $citizen->save();

                $citizenPhone->fill([
                    'phone' => $data['phone'],
                ]);
                $citizenPhone->save();
            }

            return $this->formatCitizen($citizen, $citizenPhone);
        });
    }

    public function create(array $data): Demand
    {
        $demandData = $data['demanda'];
        $citizen = Citizen::query()->findOrFail($demandData['citizen_id']);

        $canCreate = (bool) $data['can_create'];

        return $this->demandService->create([
            'title' => $demandData['title'],
            'description' => $demandData['description'],
            'service_area' => $demandData['service_area'] ?? null,
            'status' => $canCreate ? 'under_review' : 'discarded',
            'discard_message' => $canCreate ? null : ($data['message'] ?? null),
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

    private function formatCitizen(Citizen $citizen, ?CitizenPhone $citizenPhone = null): array
    {
        return [
            'id' => $citizen->id,
            'name' => $citizen->name,
            'phone' => $citizenPhone?->phone ?? $citizen->phone,
            'receive_demand_updates' => (bool) $citizen->receive_demand_updates,
        ];
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '55') && strlen($digits) > 11) {
            return substr($digits, 2);
        }

        return $digits;
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
