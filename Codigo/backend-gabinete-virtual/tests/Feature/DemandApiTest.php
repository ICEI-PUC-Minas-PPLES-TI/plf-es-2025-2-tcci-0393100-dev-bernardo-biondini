<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\City;
use App\Models\Institution;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_demands_with_service_area(): void
    {
        $token = $this->issueTokenForPermission(PermissionCodes::DEMANDS_MANAGE);
        $city = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Hospital Regional',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $responsibleUser = User::factory()->create();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands/options')
            ->assertOk()
            ->assertJsonPath('data.service_areas.0.value', 'health');

        $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/demands', [
                'title' => 'Mutirão de consultas',
                'description' => 'Organizar atendimento especializado.',
                'service_area' => 'health',
                'status' => 'open',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ]);

        $demandId = $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.service_area', 'health');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/demands/{$demandId}")
            ->assertOk()
            ->assertJsonPath('data.id', $demandId)
            ->assertJsonPath('data.status', 'open');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/demands/{$demandId}", [
                'title' => 'Mutirão de consultas',
                'description' => 'Organizar atendimento especializado e triagem.',
                'service_area' => 'social_assistance',
                'status' => 'in_progress',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.service_area', 'social_assistance')
            ->assertJsonPath('data.status', 'in_progress');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands?service_area=social_assistance')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $demandId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/demands/{$demandId}/histories")
            ->assertOk()
            ->assertJsonPath('data.data.0.demand_id', $demandId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/demands/{$demandId}")
            ->assertOk()
            ->assertJsonPath('message', 'Demanda removida com sucesso.');

        $this->assertDatabaseMissing('demands', ['id' => $demandId]);
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
