<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectLaw\StoreProjectLawRequest;
use App\Http\Requests\ProjectLaw\UpdateProjectLawRequest;
use App\Http\Requests\ProjectLaw\UpdateProjectLawStatusRequest;
use App\Services\ProjectLaw\ProjectLawService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectLawController extends Controller
{
    public function __construct(private readonly ProjectLawService $projectLawService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->query('status'),
            'sort_by' => $request->query('sort_by', 'created_at'),
            'sort_direction' => $request->query('sort_direction', 'desc'),
        ];

        return response()->json([
            'data' => $this->projectLawService->list($perPage, $filters),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->projectLawService->options(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->projectLawService->findById($id),
        ]);
    }

    public function store(StoreProjectLawRequest $request): JsonResponse
    {
        $projectLaw = $this->projectLawService->create($request->validated());

        return response()->json([
            'message' => 'Projeto de lei criado com sucesso.',
            'data' => $projectLaw,
        ], 201);
    }

    public function update(UpdateProjectLawRequest $request, int $id): JsonResponse
    {
        $projectLaw = $this->projectLawService->update($id, $request->validated());

        return response()->json([
            'message' => 'Projeto de lei atualizado com sucesso.',
            'data' => $projectLaw,
        ]);
    }

    public function updateStatus(UpdateProjectLawStatusRequest $request, int $id): JsonResponse
    {
        $projectLaw = $this->projectLawService->updateStatus($id, $request->validated()['status']);

        return response()->json([
            'message' => 'Status do projeto de lei atualizado com sucesso.',
            'data' => $projectLaw,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->projectLawService->delete($id);

        return response()->json([
            'message' => 'Projeto de lei removido com sucesso.',
        ]);
    }
}
