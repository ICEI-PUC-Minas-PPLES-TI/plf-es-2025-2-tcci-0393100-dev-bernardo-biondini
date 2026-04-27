<?php

namespace App\Services\Agenda;

use App\Exceptions\AgendaConflictException;
use App\Models\City;
use App\Models\Demand;
use App\Models\Event;
use App\Models\EventAlert;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AgendaService
{
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

        return $this->findEventById($event->id);
    }

    public function deleteEvent(int $id): void
    {
        $event = Event::query()->findOrFail($id);
        $event->delete();
    }

    public function listAlerts(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $eventId = $filters['event_id'] ?? null;
        $alertFrom = $filters['alert_from'] ?? null;
        $alertTo = $filters['alert_to'] ?? null;

        return EventAlert::query()
            ->with('event:id,title,starts_at,ends_at,location')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('message', 'like', "%{$search}%");
                });
            })
            ->when($eventId, function ($query) use ($eventId) {
                $query->where('event_id', $eventId);
            })
            ->when($alertFrom, function ($query) use ($alertFrom) {
                $query->where('alert_at', '>=', $alertFrom);
            })
            ->when($alertTo, function ($query) use ($alertTo) {
                $query->where('alert_at', '<=', $alertTo);
            })
            ->orderBy('alert_at', 'asc')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function createAlert(array $data): EventAlert
    {
        return EventAlert::query()->create([
            'event_id' => $data['event_id'] ?? null,
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'alert_at' => Carbon::parse($data['alert_at']),
            'lead_time_minutes' => $data['lead_time_minutes'] ?? null,
            'channel' => $data['channel'],
            'is_recurring' => (bool) ($data['is_recurring'] ?? false),
        ])->load('event:id,title,starts_at,ends_at,location');
    }

    public function deleteAlert(int $id): void
    {
        $alert = EventAlert::query()->findOrFail($id);
        $alert->delete();
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
