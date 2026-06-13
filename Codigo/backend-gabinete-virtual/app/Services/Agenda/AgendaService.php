<?php

namespace App\Services\Agenda;

use App\Exceptions\AgendaConflictException;
use App\Models\City;
use App\Models\Demand;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AgendaService
{
    public function __construct(private readonly AgendaReminderService $agendaReminderService)
    {
    }

    public function listEvents(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $cityId = $filters['city_id'] ?? null;
        $startsFrom = $filters['starts_from'] ?? null;
        $endsTo = $filters['ends_to'] ?? null;
        $sortBy = in_array($filters['sort_by'] ?? null, ['starts_at', 'title', 'created_at'], true)
            ? $filters['sort_by']
            : 'starts_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'asc';

        return Event::query()
            ->with([
                'city:id,name,region',
                'demands:id,title,status',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($cityId, function ($query) use ($cityId) {
                $query->where('city_id', $cityId);
            })
            ->when($startsFrom, function ($query) use ($startsFrom) {
                $query->where('starts_at', '>=', $startsFrom);
            })
            ->when($endsTo, function ($query) use ($endsTo) {
                $query->where('ends_at', '<=', $endsTo);
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findEventById(int $id): Event
    {
        return Event::query()
            ->with([
                'city:id,name,region',
                'demands:id,title,status',
                'alerts',
            ])
            ->findOrFail($id);
    }

    public function createEvent(array $data): Event
    {
        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = Carbon::parse($data['ends_at']);

        $this->assertNoConflict($startsAt, $endsAt);

        $event = Event::query()->create([
            'title' => $data['title'],
            'type' => $data['type'],
            'event_at' => $startsAt,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'location' => $data['location'],
            'context' => $data['description'] ?? '',
            'description' => $data['description'] ?? null,
            'participants_expected' => $data['participants_expected'] ?? null,
            'color' => $data['color'] ?? null,
            'city_id' => $data['city_id'] ?? null,
        ]);

        $event->demands()->sync($data['demand_ids'] ?? []);
        $this->agendaReminderService->syncAutomaticRemindersForEvent($event->fresh());

        return $this->findEventById($event->id);
    }

    public function updateEvent(int $id, array $data): Event
    {
        $event = Event::query()->findOrFail($id);

        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = Carbon::parse($data['ends_at']);

        $this->assertNoConflict($startsAt, $endsAt, $id);

        $event->update([
            'title' => $data['title'],
            'type' => $data['type'],
            'event_at' => $startsAt,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'location' => $data['location'],
            'context' => $data['description'] ?? '',
            'description' => $data['description'] ?? null,
            'participants_expected' => $data['participants_expected'] ?? null,
            'color' => $data['color'] ?? null,
            'city_id' => $data['city_id'] ?? null,
        ]);

        $event->demands()->sync($data['demand_ids'] ?? []);
        $this->agendaReminderService->syncAutomaticRemindersForEvent($event->fresh());

        return $this->findEventById($event->id);
    }

    public function deleteEvent(int $id): void
    {
        $event = Event::query()->findOrFail($id);
        $this->agendaReminderService->deleteAutomaticRemindersForEvent($event->id);
        $event->delete();
    }

    public function options(): array
    {
        return [
            'types' => [
                ['value' => 'meeting', 'label' => 'Reunião'],
                ['value' => 'audience', 'label' => 'Audiência'],
                ['value' => 'visit', 'label' => 'Visita'],
                ['value' => 'session', 'label' => 'Sessão'],
                ['value' => 'other', 'label' => 'Outro'],
            ],
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'region']),
            'demands' => Demand::query()
                ->orderByDesc('created_at')
                ->get(['id', 'title', 'status']),
        ];
    }

    private function assertNoConflict(Carbon $startsAt, Carbon $endsAt, ?int $ignoreEventId = null): void
    {
        $conflicts = Event::query()
            ->where(function ($query) use ($startsAt, $endsAt) {
                $query->where('starts_at', '<', $endsAt)
                    ->where('ends_at', '>', $startsAt);
            })
            ->when($ignoreEventId, function ($query) use ($ignoreEventId) {
                $query->where('id', '<>', $ignoreEventId);
            })
            ->orderBy('starts_at')
            ->get(['id', 'title', 'starts_at', 'ends_at', 'location']);

        if ($conflicts->isNotEmpty()) {
            throw new AgendaConflictException(
                $conflicts
                    ->map(function (Event $event) {
                        return [
                            'id' => $event->id,
                            'title' => $event->title,
                            'starts_at' => optional($event->starts_at)?->toISOString(),
                            'ends_at' => optional($event->ends_at)?->toISOString(),
                            'location' => $event->location,
                        ];
                    })
                    ->values()
                    ->all(),
            );
        }
    }
}
