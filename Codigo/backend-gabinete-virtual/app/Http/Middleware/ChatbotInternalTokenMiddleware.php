<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ChatbotInternalTokenMiddleware
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $configuredToken = (string) config('services.chatbot.internal_token', '');

        if ($configuredToken === '') {
            return response()->json([
                'message' => 'Token interno do chatbot nao configurado.',
            ], 500);
        }

        $providedToken = (string) $request->header('X-Chatbot-Token', '');

        if ($providedToken === '' || ! hash_equals($configuredToken, $providedToken)) {
            return response()->json([
                'message' => 'Token interno do chatbot invalido.',
            ], 401);
        }

        return $next($request);
    }
}
