<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $permissionCode): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Usuario nao autenticado.',
            ], 401);
        }

        if (! $user->hasPermission($permissionCode)) {
            return response()->json([
                'message' => 'Voce nao tem permissao para executar esta acao.',
            ], 403);
        }

        return $next($request);
    }
}
