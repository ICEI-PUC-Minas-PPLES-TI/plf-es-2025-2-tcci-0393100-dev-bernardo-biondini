<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chatbot\StoreChatbotDemandRequest;
use App\Services\Demand\ChatbotDemandService;
use Illuminate\Http\JsonResponse;

class ChatbotDemandController extends Controller
{
    public function __construct(private readonly ChatbotDemandService $chatbotDemandService)
    {
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->options(),
        ]);
    }

    public function store(StoreChatbotDemandRequest $request): JsonResponse
    {
        $demand = $this->chatbotDemandService->create($request->validated());

        return response()->json([
            'message' => 'Demanda recebida com sucesso.',
            'data' => $demand,
        ], 201);
    }

    public function status(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->status($id),
        ]);
    }
}
