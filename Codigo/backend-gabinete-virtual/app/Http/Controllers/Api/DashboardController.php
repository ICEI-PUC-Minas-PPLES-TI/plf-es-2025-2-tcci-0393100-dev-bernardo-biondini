<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboardService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->overview([
                'city_id' => $request->filled('city_id')
                    ? $request->integer('city_id')
                    : null,
                'region' => $request->filled('region')
                    ? $request->string('region')->toString()
                    : null,
            ]),
        ]);
    }
}
