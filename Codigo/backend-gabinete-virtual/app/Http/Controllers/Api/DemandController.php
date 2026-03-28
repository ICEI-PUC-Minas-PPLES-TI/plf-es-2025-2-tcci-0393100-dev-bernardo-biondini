<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Demand\StoreDemandRequest;
use App\Http\Requests\Demand\UpdateDemandRequest;
use App\Services\Demand\DemandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemandController extends Controller
{
    public function __construct(private readonly DemandService $demandService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $filters = [
            'search' => $request->string('search')->toString(),
            'responsible_user_id' => $request->filled('responsible_user_id')
                ? $request->integer('responsible_user_id')
                : null,
            'sort_by' => $request->query('sort_by', 'created_at'),
            'sort_direction' => $request->query('sort_direction', 'desc'),
        ];

        return response()->json([
            'data' => $this->demandService->list($perPage, $filters),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->demandService->options(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->demandService->findById($id),
        ]);
    }

    public function store(StoreDemandRequest $request): JsonResponse
    {
        $demand = $this->demandService->create(
            $request->validated(),
            $request->user()?->id,
        );

        return response()->json([
            'message' => 'Demanda criada com sucesso.',
            'data' => $demand,
        ], 201);
    }

    public function update(UpdateDemandRequest $request, int $id): JsonResponse
    {
        $demand = $this->demandService->update(
            $id,
            $request->validated(),
            $request->user()?->id,
        );

        return response()->json([
            'message' => 'Demanda atualizada com sucesso.',
            'data' => $demand,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->demandService->delete($id, request()->user()?->id);

        return response()->json([
            'message' => 'Demanda removida com sucesso.',
        ]);
    }
}
