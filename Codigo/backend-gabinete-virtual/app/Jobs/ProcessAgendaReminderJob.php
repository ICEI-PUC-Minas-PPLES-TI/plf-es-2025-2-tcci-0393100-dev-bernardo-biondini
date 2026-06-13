<?php

namespace App\Jobs;

use App\Models\EventAlert;
use App\Services\Notification\ChatbotNotificationClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ProcessAgendaReminderJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly int $alertId)
    {
    }

    public function handle(ChatbotNotificationClient $client): void
    {
        $alert = EventAlert::query()->with('event:id,title')->find($this->alertId);

        if (! $alert || ! $alert->user_id) {
            return;
        }

        try {
            $client->publishSystemAlert(
                (int) $alert->user_id,
                (int) $alert->id,
                $alert->title,
                $alert->message ?? $alert->title,
                type: 'agenda_reminder',
                demandId: null,
                eventId: $alert->event_id ? (int) $alert->event_id : null,
            );

            $alert->forceFill([
                'status' => EventAlert::STATUS_SENT,
                'sent_at' => now(),
                'error_message' => null,
            ])->save();
        } catch (Throwable $exception) {
            $alert->forceFill([
                'status' => EventAlert::STATUS_FAILED,
                'error_message' => $exception->getMessage(),
            ])->save();

            throw $exception;
        }
    }
}
