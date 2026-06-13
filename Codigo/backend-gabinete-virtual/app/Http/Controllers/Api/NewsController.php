<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cms\ManageCmsRequest;
use App\Http\Requests\Cms\StoreNewsRequest;
use App\Http\Requests\Cms\UpdateNewsRequest;
use App\Services\Cms\NewsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    public function __construct(private readonly NewsService $newsService)
    {
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 6), 100));
        $filters = [
            'search' => $request->string('search')->toString(),
            'sort_by' => $request->query('sort_by', 'published_at'),
            'sort_direction' => $request->query('sort_direction', 'desc'),
        ];

        return response()->json([
            'data' => $this->newsService->listPublic($perPage, $filters),
        ]);
    }

    public function index(ManageCmsRequest $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $filters = [
            'search' => $request->string('search')->toString(),
            'sort_by' => $request->query('sort_by', 'published_at'),
            'sort_direction' => $request->query('sort_direction', 'desc'),
        ];

        return response()->json([
            'data' => $this->newsService->listAdmin($perPage, $filters),
        ]);
    }

    public function show(ManageCmsRequest $request, int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->newsService->findById($id),
        ]);
    }

    public function store(StoreNewsRequest $request): JsonResponse
    {
        $news = $this->newsService->create(
            $request->validated(),
            (int) $request->user()->id,
        );

        return response()->json([
            'message' => 'Noticia criada com sucesso.',
            'data' => $news,
        ], 201);
    }

    public function update(UpdateNewsRequest $request, int $id): JsonResponse
    {
        $news = $this->newsService->update($id, $request->validated());

        return response()->json([
            'message' => 'Noticia atualizada com sucesso.',
            'data' => $news,
        ]);
    }

    public function destroy(ManageCmsRequest $request, int $id): JsonResponse
    {
        $this->newsService->delete($id);

        return response()->json([
            'message' => 'Noticia removida com sucesso.',
        ]);
    }
}
