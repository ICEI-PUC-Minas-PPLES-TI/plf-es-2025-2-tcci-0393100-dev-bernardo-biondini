<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AccessProfile\StoreAccessProfileRequest;
use App\Http\Requests\AccessProfile\UpdateAccessProfileRequest;
use App\Services\Auth\AccessProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccessProfileController extends Controller
{
    public function __construct(private readonly AccessProfileService $accessProfileService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        return response()->json([
            'data' => $this->accessProfileService->list($perPage),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->accessProfileService->findById($id),
        ]);
    }

    public function store(StoreAccessProfileRequest $request): JsonResponse
    {
        $role = $this->accessProfileService->create($request->validated());

        return response()->json([
            'message' => 'Papel criado com sucesso.',
            'data' => $role,
        ], 201);
    }

    public function update(UpdateAccessProfileRequest $request, int $id): JsonResponse
    {
        $role = $this->accessProfileService->update($id, $request->validated());

        return response()->json([
            'message' => 'Papel atualizado com sucesso.',
            'data' => $role,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->accessProfileService->delete($id);

        return response()->json([
            'message' => 'Papel removido com sucesso.',
        ]);
    }
}
