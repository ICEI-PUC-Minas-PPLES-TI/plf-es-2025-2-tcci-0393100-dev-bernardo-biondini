<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Demand\ListDemandHistoriesRequest;
use App\Services\Demand\DemandHistoryService;
use Illuminate\Http\JsonResponse;

class DemandHistoryController extends Controller
{
    public function __construct(private readonly DemandHistoryService $demandHistoryService)
    {
    }

    public function indexByDemand(ListDemandHistoriesRequest $request, int $demandId): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        return response()->json([
            'data' => $this->demandHistoryService->listByDemand($demandId, $perPage),
        ]);
    }
}
