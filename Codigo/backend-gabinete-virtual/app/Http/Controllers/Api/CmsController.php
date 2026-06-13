<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cms\ManageCmsRequest;
use App\Http\Requests\Cms\UpdateCmsSectionRequest;
use App\Services\Cms\CmsSectionService;
use App\Services\Cms\NewsService;
use App\Services\Cms\SiteProjectService;
use Illuminate\Http\JsonResponse;

class CmsController extends Controller
{
    public function __construct(
        private readonly CmsSectionService $cmsSectionService,
        private readonly NewsService $newsService,
        private readonly SiteProjectService $siteProjectService,
    ) {
    }

    public function publicOverview(): JsonResponse
    {
        return response()->json([
            'data' => [
                'sections' => $this->cmsSectionService->all(),
                'news' => $this->newsService->latest(),
                'site_projects' => $this->siteProjectService->latest(),
            ],
        ]);
    }

    public function showPublic(string $key): JsonResponse
    {
        return response()->json([
            'data' => $this->cmsSectionService->findByKey($key),
        ]);
    }

    public function index(ManageCmsRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->cmsSectionService->all(),
        ]);
    }

    public function options(ManageCmsRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->siteProjectService->options(),
        ]);
    }

    public function update(UpdateCmsSectionRequest $request, string $key): JsonResponse
    {
        $section = $this->cmsSectionService->update($key, $request->validated());

        return response()->json([
            'message' => 'Secao atualizada com sucesso.',
            'data' => $section,
        ]);
    }
}
