<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Amendment\StoreAmendmentRequest;
use App\Http\Requests\Amendment\UpdateAmendmentRequest;
use App\Http\Requests\Amendment\UpdateAmendmentStatusRequest;
use App\Services\Amendment\AmendmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AmendmentController extends Controller
{
    public function __construct(private readonly AmendmentService $amendmentService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->query('status'),
            'city_id' => $request->filled('city_id')
                ? $request->integer('city_id')
                : null,
            'sort_by' => $request->query('sort_by', 'created_at'),
            'sort_direction' => $request->query('sort_direction', 'desc'),
        ];

        return response()->json([
            'data' => $this->amendmentService->list($perPage, $filters),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->amendmentService->options(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->amendmentService->findById($id),
        ]);
    }

    public function store(StoreAmendmentRequest $request): JsonResponse
    {
        $amendment = $this->amendmentService->create($request->validated());

        return response()->json([
            'message' => 'Emenda criada com sucesso.',
            'data' => $amendment,
        ], 201);
    }

    public function update(UpdateAmendmentRequest $request, int $id): JsonResponse
    {
        $amendment = $this->amendmentService->update($id, $request->validated());

        return response()->json([
            'message' => 'Emenda atualizada com sucesso.',
            'data' => $amendment,
        ]);
    }

    public function updateStatus(UpdateAmendmentStatusRequest $request, int $id): JsonResponse
    {
        $amendment = $this->amendmentService->updateStatus($id, $request->validated()['status']);

        return response()->json([
            'message' => 'Status da emenda atualizado com sucesso.',
            'data' => $amendment,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->amendmentService->delete($id);

        return response()->json([
            'message' => 'Emenda removida com sucesso.',
        ]);
    }
}
