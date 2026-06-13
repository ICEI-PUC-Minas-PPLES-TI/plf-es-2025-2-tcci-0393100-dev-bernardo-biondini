<?php

namespace Tests\Feature;

use App\Jobs\ProcessAgendaReminderJob;
use App\Models\EventAlert;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProcessAgendaReminderJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_delivers_agenda_reminder_through_websocket_publisher(): void
    {
        config([
            'services.chatbot.service_url' => 'http://chatbot.test',
            'services.chatbot.service_token' => 'internal-secret',
        ]);

        Http::fake([
            'http://chatbot.test/internal/notifications/websocket-alert' => Http::response([
                'status' => 'published',
            ]),
        ]);

        $user = User::factory()->create();

        $alert = EventAlert::query()->create([
            'event_id' => null,
            'user_id' => $user->id,
            'title' => 'Lembrete da agenda',
            'message' => 'O evento começa em 1 hora.',
            'alert_at' => now()->subMinutes(5),
            'lead_time_minutes' => 60,
            'channel' => 'system',
            'status' => EventAlert::STATUS_QUEUED,
            'is_automatic' => true,
            'is_recurring' => false,
        ]);

        (new ProcessAgendaReminderJob($alert->id))
            ->handle(app(\App\Services\Notification\ChatbotNotificationClient::class));

        Http::assertSent(function ($request) use ($alert, $user) {
            return $request->url() === 'http://chatbot.test/internal/notifications/websocket-alert'
                && $request->hasHeader('X-Internal-Token', 'internal-secret')
                && $request['user_id'] === $user->id
                && $request['alert_id'] === $alert->id
                && $request['type'] === 'agenda_reminder'
                && $request['event_id'] === null
                && $request['demand_id'] === null;
        });

        $this->assertDatabaseHas('event_alerts', [
            'id' => $alert->id,
            'status' => EventAlert::STATUS_SENT,
        ]);
    }
}
