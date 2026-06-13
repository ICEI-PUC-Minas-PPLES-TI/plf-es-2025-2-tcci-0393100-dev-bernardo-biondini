<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DemandAlert\ListDemandAlertsRequest;
use App\Http\Requests\DemandAlert\MarkDemandAlertReadRequest;
use App\Services\Notification\DemandAlertService;
use Illuminate\Http\JsonResponse;

class DemandAlertController extends Controller
{
    public function __construct(private readonly DemandAlertService $demandAlertService)
    {
    }

    public function index(ListDemandAlertsRequest $request): JsonResponse
    {
        $limit = max(1, min((int) $request->integer('limit', 15), 50));
        $status = $request->string('status')->toString();

        $alerts = $status === 'all'
            ? $request->user()
                ->demandAlerts()
                ->where('channel', \App\Models\DemandAlert::CHANNEL_SYSTEM)
                ->latest('created_at')
                ->limit($limit)
                ->get()
            : $this->demandAlertService->unreadSystemAlertsForUser($request->user(), $limit);

        return response()->json([
            'data' => $alerts,
        ]);
    }

    public function markAsRead(MarkDemandAlertReadRequest $request, int $id): JsonResponse
    {
        $alert = $this->demandAlertService->markAsRead($id, $request->user());

        return response()->json([
            'message' => 'Alerta marcado como lido.',
            'data' => $alert,
        ]);
    }
}
