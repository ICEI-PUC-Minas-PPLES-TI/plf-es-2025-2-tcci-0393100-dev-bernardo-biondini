<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cms\ManageCmsRequest;
use App\Http\Requests\Cms\StoreSiteProjectRequest;
use App\Http\Requests\Cms\UpdateSiteProjectRequest;
use App\Services\Cms\SiteProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteProjectController extends Controller
{
    public function __construct(private readonly SiteProjectService $siteProjectService)
    {
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 6), 100));
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
            'data' => $this->siteProjectService->listPublic($perPage, $filters),
        ]);
    }

    public function index(ManageCmsRequest $request): JsonResponse
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
            'data' => $this->siteProjectService->listAdmin($perPage, $filters),
        ]);
    }

    public function show(ManageCmsRequest $request, int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->siteProjectService->findById($id),
        ]);
    }

    public function store(StoreSiteProjectRequest $request): JsonResponse
    {
        $siteProject = $this->siteProjectService->create(
            $request->validated(),
            (int) $request->user()->id,
        );

        return response()->json([
            'message' => 'Projeto do site criado com sucesso.',
            'data' => $siteProject,
        ], 201);
    }

    public function update(UpdateSiteProjectRequest $request, int $id): JsonResponse
    {
        $siteProject = $this->siteProjectService->update($id, $request->validated());

        return response()->json([
            'message' => 'Projeto do site atualizado com sucesso.',
            'data' => $siteProject,
        ]);
    }

    public function destroy(ManageCmsRequest $request, int $id): JsonResponse
    {
        $this->siteProjectService->delete($id);

        return response()->json([
            'message' => 'Projeto do site removido com sucesso.',
        ]);
    }
}
