<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chatbot\ListRecentChatbotDemandsRequest;
use App\Http\Requests\Chatbot\LookupChatbotCitizenRequest;
use App\Http\Requests\Chatbot\SearchChatbotCitiesRequest;
use App\Http\Requests\Chatbot\StoreChatbotCitizenRequest;
use App\Http\Requests\Chatbot\StoreChatbotDemandRequest;
use App\Models\City;
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

    public function searchCities(SearchChatbotCitiesRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->searchCities(
                $request->string('query')->toString(),
                $request->integer('limit', 5),
            ),
        ]);
    }

    public function cityInstitutions(City $city): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->institutionsByCity($city->id),
        ]);
    }

    public function lookupCitizen(LookupChatbotCitizenRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->findCitizenByPhone(
                $request->string('phone')->toString(),
            ),
        ]);
    }

    public function storeCitizen(StoreChatbotCitizenRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'Cidadao identificado com sucesso.',
            'data' => $this->chatbotDemandService->registerCitizen($request->validated()),
        ], 201);
    }

    public function store(StoreChatbotDemandRequest $request): JsonResponse
    {
        $demand = $this->chatbotDemandService->create($request->validated());

        return response()->json([
            'message' => 'Demanda recebida com sucesso.',
            'data' => $demand,
        ], 201);
    }

    public function openDemands(ListRecentChatbotDemandsRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->recentOpenDemands(
                $request->integer('city_id'),
                $request->integer('months', 3),
            ),
        ]);
    }

    public function status(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->chatbotDemandService->status($id),
        ]);
    }
}
