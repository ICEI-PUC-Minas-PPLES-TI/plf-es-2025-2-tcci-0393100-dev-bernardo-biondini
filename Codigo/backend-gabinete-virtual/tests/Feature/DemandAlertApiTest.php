<?php

namespace Tests\Feature;

use App\Jobs\ProcessDemandAlertJob;
use App\Models\AccessProfile;
use App\Models\Citizen;
use App\Models\City;
use App\Models\Demand;
use App\Models\DemandAlert;
use App\Models\Institution;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class DemandAlertApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    public function test_demand_update_creates_system_and_chatbot_alerts_and_user_can_mark_alert_as_read(): void
    {
        Queue::fake();

        $managerToken = $this->issueTokenForPermission(PermissionCodes::DEMANDS_MANAGE);
        $responsibleSession = $this->issueAuthenticatedSession();
        $city = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Hospital Regional',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $citizen = Citizen::query()->create([
            'name' => 'Maria Souza',
            'phone' => '(31) 98888-1111',
            'receive_demand_updates' => true,
        ]);

        $demand = Demand::query()->create([
            'title' => 'Mutirão de exames',
            'description' => 'Solicitação inicial.',
            'service_area' => 'health',
            'status' => 'open',
            'priority' => 'medium',
            'responsible_user_id' => $responsibleSession['user']->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_citizen_id' => $citizen->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$managerToken}")
            ->putJson("/api/demands/{$demand->id}", [
                'title' => 'Mutirão de exames atualizado',
                'description' => 'Solicitação atualizada.',
                'service_area' => 'social_assistance',
                'status' => 'in_progress',
                'priority' => 'high',
                'responsible_user_id' => $responsibleSession['user']->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ])
            ->assertOk();

        $this->assertDatabaseCount('demand_alerts', 3);
        $this->assertDatabaseHas('demand_alerts', [
            'demand_id' => $demand->id,
            'user_id' => $responsibleSession['user']->id,
            'channel' => 'system',
            'type' => 'demand_updated',
        ]);
        $this->assertDatabaseHas('demand_alerts', [
            'demand_id' => $demand->id,
            'citizen_id' => $citizen->id,
            'channel' => 'chatbot',
            'type' => 'demand_updated',
        ]);

        Queue::assertPushed(ProcessDemandAlertJob::class, 3);

        $alertsResponse = $this->actingAs($responsibleSession['user'], 'api')
            ->getJson('/api/alerts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.demand_id', $demand->id)
            ->assertJsonPath('data.0.channel', 'system');

        $alertId = (int) DemandAlert::query()
            ->where('user_id', $responsibleSession['user']->id)
            ->where('channel', 'system')
            ->value('id');

        $this->actingAs($responsibleSession['user'], 'api')
            ->postJson("/api/alerts/{$alertId}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $alertId);

        $this->assertDatabaseHas('demand_alerts', [
            'id' => $alertId,
            'user_id' => $responsibleSession['user']->id,
        ]);
        $this->assertDatabaseMissing('demand_alerts', [
            'id' => $alertId,
            'read_at' => null,
        ]);
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de Demandas',
            'description' => 'Perfil de teste para demandas.',
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
