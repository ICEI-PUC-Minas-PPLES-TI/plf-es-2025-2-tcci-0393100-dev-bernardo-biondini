<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\City;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AgendaApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_agenda_events_and_alerts_with_conflict_detection(): void
    {
        $token = $this->issueTokenForPermission(PermissionCodes::AGENDA_MANAGE);
        $city = City::query()->create([
            'name' => 'Curvelo',
            'region' => 'Central Mineira',
        ]);

        $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/agenda/events', [
                'title' => 'Audiência com lideranças',
                'type' => 'audience',
                'starts_at' => '2026-04-14 09:00:00',
                'ends_at' => '2026-04-14 10:00:00',
                'location' => 'Gabinete Regional',
                'description' => 'Discussão de prioridades do semestre.',
                'participants_expected' => 12,
                'color' => '#1F7A8C',
                'city_id' => $city->id,
                'demand_ids' => [],
            ]);

        $eventId = $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.title', 'Audiência com lideranças')
            ->assertJsonPath('data.type', 'audience')
            ->assertJsonPath('data.city_id', $city->id);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/agenda/events/options')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'types',
                    'cities',
                    'demands',
                ],
            ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/agenda/events?month=4&year=2026')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $eventId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/agenda/events', [
                'title' => 'Reunião em conflito',
                'type' => 'meeting',
                'starts_at' => '2026-04-14 09:30:00',
                'ends_at' => '2026-04-14 10:30:00',
                'location' => 'Sede',
                'description' => 'Teste de conflito.',
                'demand_ids' => [],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Conflito de agenda detectado para o período informado.');

        $alertResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/agenda/alerts', [
                'event_id' => $eventId,
                'title' => 'Lembrete da audiência',
                'message' => 'Levar pauta e lista de presença.',
                'alert_at' => '2026-04-14 08:00:00',
                'lead_time_minutes' => 60,
                'channel' => 'system',
                'is_recurring' => false,
            ]);

        $alertId = $alertResponse->json('data.id');

        $alertResponse->assertCreated()
            ->assertJsonPath('data.event_id', $eventId)
            ->assertJsonPath('data.title', 'Lembrete da audiência');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/agenda/events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('data.id', $eventId)
            ->assertJsonPath('data.type', 'audience');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/agenda/events/{$eventId}", [
                'title' => 'Audiência com lideranças comunitárias',
                'type' => 'meeting',
                'starts_at' => '2026-04-14 11:00:00',
                'ends_at' => '2026-04-14 12:00:00',
                'location' => 'Gabinete Regional',
                'description' => 'Ajuste da agenda do dia.',
                'participants_expected' => 14,
                'color' => '#1F7A8C',
                'city_id' => $city->id,
                'demand_ids' => [],
            ])
            ->assertOk()
            ->assertJsonPath('data.type', 'meeting')
            ->assertJsonPath('data.title', 'Audiência com lideranças comunitárias');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/agenda/alerts?month=4&year=2026')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $alertId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/agenda/alerts/{$alertId}")
            ->assertOk()
            ->assertJsonPath('message', 'Alerta removido com sucesso.');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/agenda/events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('message', 'Evento removido com sucesso.');

        $this->assertDatabaseMissing('events', ['id' => $eventId]);
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de Agenda',
            'description' => 'Perfil de teste para agenda.',
        ]);

        $permission = Permission::query()->create([
            'code' => $permissionCode,
            'description' => $permissionCode,
        ]);

        $profile->permissions()->attach($permission->id);

        $user = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => 'test',
            'token' => hash('sha256', $plainTextToken),
        ]);

        return $plainTextToken;
    }
}
