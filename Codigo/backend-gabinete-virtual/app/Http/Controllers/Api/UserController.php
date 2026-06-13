<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\ListUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function index(ListUserRequest $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        return response()->json([
            'data' => $this->userService->list($perPage),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return response()->json([
            'message' => 'Usuario criado com sucesso.',
            'data' => $user,
        ], 201);
    }
}
