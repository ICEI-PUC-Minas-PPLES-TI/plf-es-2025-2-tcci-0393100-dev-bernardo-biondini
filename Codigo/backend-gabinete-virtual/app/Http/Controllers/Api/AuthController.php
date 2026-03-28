<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\AuthenticatedUserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $authData = $this->authService->register($request->validated());

        return response()->json([
            'message' => 'Usuario cadastrado com sucesso.',
            'token' => $authData['token'],
            'token_type' => $authData['token_type'],
            'user' => new AuthenticatedUserResource($authData['user']),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $authData = $this->authService->login($request->validated());

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'token' => $authData['token'],
            'token_type' => $authData['token_type'],
            'user' => new AuthenticatedUserResource($authData['user']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->authService->getAuthenticatedUser($request->user());

        return response()->json([
            'user' => new AuthenticatedUserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $plainTextToken = $this->authService->extractBearerToken($request->header('Authorization'));

        $this->authService->logout($request->user(), $plainTextToken);

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }
}
