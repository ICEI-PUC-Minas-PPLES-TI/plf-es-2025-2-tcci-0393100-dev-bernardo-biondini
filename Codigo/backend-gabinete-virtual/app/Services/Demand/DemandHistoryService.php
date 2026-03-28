<?php

namespace App\Services\Demand;

use App\Models\Demand;
use App\Models\DemandHistory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DemandHistoryService
{
    public function listByDemand(int $demandId, int $perPage = 10): LengthAwarePaginator
    {
        Demand::query()->findOrFail($demandId);

        return DemandHistory::query()
            ->with([
                'demand:id,title,status,priority',
                'user:id,name,email',
            ])
            ->where('demand_id', $demandId)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function logDemandChange(
        int $demandId,
        ?int $userId,
        string $action,
        string $description,
        ?array $metadata = null,
    ): DemandHistory {
        $history = DemandHistory::query()->create([
            'demand_id' => $demandId,
            'user_id' => $userId,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
        ]);

        return $history->load([
            'demand:id,title,status,priority',
            'user:id,name,email',
        ]);
    }
}
