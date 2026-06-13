<?php

namespace Tests\Feature;

use App\Jobs\ProcessAgendaReminderJob;
use App\Models\AccessProfile;
use App\Models\City;
use App\Models\EventAlert;
use App\Models\Permission;
use App\Models\User;
use App\Services\Agenda\AgendaReminderService;
use App\Support\PermissionCodes;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class AgendaReminderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_creation_generates_user_specific_reminders_and_lists_only_own_items(): void
    {
        [$manager, $managerToken] = $this->createUserWithToken(PermissionCodes::AGENDA_MANAGE);
        [$regularUser, $regularToken] = $this->createUserWithToken();
        $startsAt = Carbon::now()->addDays(20)->setTime(10, 0, 0);
        $endsAt = $startsAt->copy()->addHours(2);

        $city = City::query()->create([
            'name' => 'Montes Claros',
            'region' => 'Norte de Minas',
        ]);

        $createResponse = $this->withHeader('Authorization', "Bearer {$managerToken}")
            ->postJson('/api/agenda/events', [
                'title' => 'Encontro regional',
                'type' => 'visit',
                'starts_at' => $startsAt->toDateTimeString(),
                'ends_at' => $endsAt->toDateTimeString(),
                'location' => 'Centro de Convenções',
                'description' => 'Agenda com lideranças locais.',
                'city_id' => $city->id,
                'demand_ids' => [],
            ]);

        $eventId = $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.id', $eventId);

        $this->assertDatabaseCount('event_alerts', 6);

        $managerAlerts = $this->withHeader('Authorization', "Bearer {$managerToken}")
            ->getJson('/api/agenda/alerts')
            ->assertOk()
            ->json('data.data');

        $this->assertCount(3, $managerAlerts);
        $this->assertTrue(
            collect($managerAlerts)->every(
                fn (array $alert) => (int) $alert['user_id'] === $manager->id
                    && (int) $alert['event_id'] === $eventId,
            ),
        );

        app('auth')->forgetGuards();

        $regularAlerts = $this->withHeader('Authorization', "Bearer {$regularToken}")
            ->getJson('/api/agenda/alerts')
            ->assertOk()
            ->json('data.data');

        $this->assertCount(3, $regularAlerts);
        $this->assertTrue(
            collect($regularAlerts)->every(
                fn (array $alert) => (int) $alert['user_id'] === $regularUser->id
                    && (int) $alert['event_id'] === $eventId,
            ),
        );
    }

    public function test_unread_reminders_can_be_listed_and_marked_as_read_by_owner(): void
    {
        [$user, $token] = $this->createUserWithToken();

        $alert = EventAlert::query()->create([
            'event_id' => null,
            'user_id' => $user->id,
            'title' => 'Lembrete disparado',
            'message' => 'Mensagem teste.',
            'alert_at' => now()->subHour(),
            'lead_time_minutes' => 60,
            'channel' => 'system',
            'status' => EventAlert::STATUS_SENT,
            'is_automatic' => true,
            'is_recurring' => false,
            'sent_at' => now()->subMinutes(5),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/agenda/alerts?status=unread')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $alert->id);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/agenda/alerts/{$alert->id}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $alert->id);

        $this->assertDatabaseHas('event_alerts', [
            'id' => $alert->id,
        ]);
        $this->assertNotNull($alert->fresh()->read_at);
    }

    public function test_due_reminders_are_queued_for_processing(): void
    {
        Queue::fake();

        [$user] = $this->createUserWithToken();

        $alert = EventAlert::query()->create([
            'event_id' => null,
            'user_id' => $user->id,
            'title' => 'Lembrete vencido',
            'message' => 'Mensagem teste.',
            'alert_at' => now()->subMinutes(10),
            'lead_time_minutes' => 60,
            'channel' => 'system',
            'status' => EventAlert::STATUS_PENDING,
            'is_automatic' => true,
            'is_recurring' => false,
            'sent_at' => null,
        ]);

        $count = app(AgendaReminderService::class)->dispatchDueReminders();

        $this->assertSame(1, $count);
        Queue::assertPushed(ProcessAgendaReminderJob::class);
        $this->assertDatabaseHas('event_alerts', [
            'id' => $alert->id,
            'status' => EventAlert::STATUS_QUEUED,
        ]);
    }

    /**
     * @return array{0: User, 1: string}
     */
    private function createUserWithToken(?string $permissionCode = null): array
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Perfil '.Str::random(6),
            'description' => 'Perfil de teste.',
        ]);

        if ($permissionCode) {
            $permission = Permission::query()->firstOrCreate([
                'code' => $permissionCode,
            ], [
                'description' => $permissionCode,
            ]);

            $profile->permissions()->attach($permission->id);
        }

        $user = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => 'test',
            'token' => hash('sha256', $plainTextToken),
        ]);

        return [$user, $plainTextToken];
    }
}
