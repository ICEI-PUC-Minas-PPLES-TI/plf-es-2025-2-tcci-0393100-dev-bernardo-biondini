<?php

namespace App\Services\Agenda;

use App\Jobs\ProcessAgendaReminderJob;
use App\Models\Event;
use App\Models\EventAlert;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class AgendaReminderService
{
    /**
     * @var array<int, string>
     */
    private const DEFAULT_LEAD_TIMES = [
        14400 => '10 dias',
        1440 => '1 dia',
        60 => '1 hora',
    ];

    /**
     * @return Collection<int, EventAlert>
     */
    public function unreadRemindersForUser(User $user, int $limit = 15): Collection
    {
        return EventAlert::query()
            ->with('event:id,title,starts_at,ends_at,location')
            ->where('user_id', $user->id)
            ->whereNotNull('sent_at')
            ->whereNull('read_at')
            ->latest('sent_at')
            ->limit(max(1, min($limit, 50)))
            ->get();
    }

    public function listUserReminders(User $user, int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $eventId = $filters['event_id'] ?? null;
        $alertFrom = $filters['alert_from'] ?? null;
        $alertTo = $filters['alert_to'] ?? null;
        $status = $filters['status'] ?? 'all';

        return EventAlert::query()
            ->with('event:id,title,starts_at,ends_at,location')
            ->where('user_id', $user->id)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('message', 'like', "%{$search}%");
                });
            })
            ->when($eventId, fn ($query) => $query->where('event_id', $eventId))
            ->when($alertFrom, fn ($query) => $query->where('alert_at', '>=', $alertFrom))
            ->when($alertTo, fn ($query) => $query->where('alert_at', '<=', $alertTo))
            ->when($status === 'unread', function ($query) {
                $query->whereNotNull('sent_at')->whereNull('read_at');
            })
            ->when($status === 'pending', function ($query) {
                $query->whereNull('sent_at');
            })
            ->orderByRaw('CASE WHEN read_at IS NULL THEN 0 ELSE 1 END')
            ->orderByDesc(DB::raw('COALESCE(sent_at, alert_at)'))
            ->paginate($perPage)
            ->withQueryString();
    }

    public function createUserAlert(array $data, User $user): EventAlert
    {
        return EventAlert::query()->create([
            'event_id' => $data['event_id'] ?? null,
            'user_id' => $user->id,
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'alert_at' => Carbon::parse($data['alert_at']),
            'lead_time_minutes' => $data['lead_time_minutes'] ?? null,
            'channel' => $data['channel'],
            'status' => EventAlert::STATUS_PENDING,
            'is_automatic' => false,
            'is_recurring' => (bool) ($data['is_recurring'] ?? false),
        ])->load('event:id,title,starts_at,ends_at,location');
    }

    public function deleteAlertForUser(int $id, User $user): void
    {
        $alert = EventAlert::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $alert->delete();
    }

    public function markAsRead(int $id, User $user): EventAlert
    {
        $alert = EventAlert::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if (! $alert->read_at) {
            $alert->forceFill([
                'read_at' => now(),
            ])->save();
        }

        return $alert->load('event:id,title,starts_at,ends_at,location');
    }

    public function syncAutomaticRemindersForEvent(Event $event): void
    {
        EventAlert::query()
            ->where('event_id', $event->id)
            ->where('is_automatic', true)
            ->delete();

        if (! $event->starts_at) {
            return;
        }

        $users = User::query()->get(['id']);

        foreach ($users as $user) {
            foreach (self::DEFAULT_LEAD_TIMES as $leadMinutes => $leadLabel) {
                $alertAt = $event->starts_at->copy()->subMinutes($leadMinutes);

                if ($alertAt->lessThan(now())) {
                    continue;
                }

                EventAlert::query()->create([
                    'event_id' => $event->id,
                    'user_id' => $user->id,
                    'title' => sprintf('Lembrete de agenda: %s', $event->title),
                    'message' => $this->buildAutomaticMessage($event, $leadLabel),
                    'alert_at' => $alertAt,
                    'lead_time_minutes' => $leadMinutes,
                    'channel' => 'system',
                    'status' => EventAlert::STATUS_PENDING,
                    'is_automatic' => true,
                    'is_recurring' => false,
                ]);
            }
        }
    }

    public function deleteAutomaticRemindersForEvent(int $eventId): void
    {
        EventAlert::query()
            ->where('event_id', $eventId)
            ->delete();
    }

    public function dispatchDueReminders(?Carbon $referenceTime = null): int
    {
        $now = $referenceTime ?? now();

        $alerts = EventAlert::query()
            ->where('channel', 'system')
            ->whereNotNull('user_id')
            ->whereIn('status', [EventAlert::STATUS_PENDING, EventAlert::STATUS_FAILED])
            ->whereNull('sent_at')
            ->where('alert_at', '<=', $now)
            ->orderBy('alert_at')
            ->get();

        foreach ($alerts as $alert) {
            $alert->forceFill([
                'status' => EventAlert::STATUS_QUEUED,
                'error_message' => null,
            ])->save();

            ProcessAgendaReminderJob::dispatch($alert->id);
        }

        return $alerts->count();
    }

    private function buildAutomaticMessage(Event $event, string $leadLabel): string
    {
        return sprintf(
            'O evento "%s" acontece em %s, no dia %s, em %s.',
            $event->title,
            $leadLabel,
            $event->starts_at?->format('d/m/Y \a\s H:i') ?? 'data indefinida',
            $event->location,
        );
    }
}
