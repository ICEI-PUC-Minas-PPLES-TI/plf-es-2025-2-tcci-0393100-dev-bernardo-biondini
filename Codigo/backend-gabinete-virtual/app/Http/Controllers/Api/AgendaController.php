<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\AgendaConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Agenda\StoreAgendaAlertRequest;
use App\Http\Requests\Agenda\StoreAgendaEventRequest;
use App\Http\Requests\Agenda\UpdateAgendaEventRequest;
use App\Services\Agenda\AgendaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    public function __construct(private readonly AgendaService $agendaService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $month = $request->integer('month');
        $year = $request->integer('year');

        $startsFrom = null;
        $endsTo = null;

        if ($month && $year && $month >= 1 && $month <= 12) {
            $startsFrom = Carbon::create($year, $month, 1)->startOfMonth()->toDateTimeString();
            $endsTo = Carbon::create($year, $month, 1)->endOfMonth()->toDateTimeString();
        }

        $filters = [
            'search' => $request->string('search')->toString(),
            'city_id' => $request->filled('city_id') ? $request->integer('city_id') : null,
            'starts_from' => $startsFrom,
            'ends_to' => $endsTo,
            'sort_by' => $request->query('sort_by', 'starts_at'),
            'sort_direction' => $request->query('sort_direction', 'asc'),
        ];

        return response()->json([
            'data' => $this->agendaService->listEvents($perPage, $filters),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->agendaService->options(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->agendaService->findEventById($id),
        ]);
    }

    public function store(StoreAgendaEventRequest $request): JsonResponse
    {
        try {
            $event = $this->agendaService->createEvent($request->validated());
        } catch (AgendaConflictException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'conflicts' => $exception->conflicts(),
            ], 422);
        }

        return response()->json([
            'message' => 'Evento criado com sucesso.',
            'data' => $event,
        ], 201);
    }

    public function update(UpdateAgendaEventRequest $request, int $id): JsonResponse
    {
        try {
            $event = $this->agendaService->updateEvent($id, $request->validated());
        } catch (AgendaConflictException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'conflicts' => $exception->conflicts(),
            ], 422);
        }

        return response()->json([
            'message' => 'Evento atualizado com sucesso.',
            'data' => $event,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->agendaService->deleteEvent($id);

        return response()->json([
            'message' => 'Evento removido com sucesso.',
        ]);
    }

    public function listAlerts(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $month = $request->integer('month');
        $year = $request->integer('year');

        $alertFrom = null;
        $alertTo = null;

        if ($month && $year && $month >= 1 && $month <= 12) {
            $alertFrom = Carbon::create($year, $month, 1)->startOfMonth()->toDateTimeString();
            $alertTo = Carbon::create($year, $month, 1)->endOfMonth()->toDateTimeString();
        }

        return response()->json([
            'data' => $this->agendaService->listAlerts($perPage, [
                'search' => $request->string('search')->toString(),
                'event_id' => $request->filled('event_id') ? $request->integer('event_id') : null,
                'alert_from' => $alertFrom,
                'alert_to' => $alertTo,
            ]),
        ]);
    }

    public function storeAlert(StoreAgendaAlertRequest $request): JsonResponse
    {
        $alert = $this->agendaService->createAlert($request->validated());

        return response()->json([
            'message' => 'Alerta criado com sucesso.',
            'data' => $alert,
        ], 201);
    }

    public function destroyAlert(int $id): JsonResponse
    {
        $this->agendaService->deleteAlert($id);

        return response()->json([
            'message' => 'Alerta removido com sucesso.',
        ]);
    }
}
