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

class AmendmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_amendments(): void
    {
        $token = $this->issueTokenForPermission(PermissionCodes::AMENDMENTS_MANAGE);
        $city = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);

        $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/amendments', [
                'number' => 'E-45/2025',
                'amount' => 500000,
                'status' => 'planned',
                'city_id' => $city->id,
                'application_area' => 'Reforma do hospital municipal',
            ]);

        $amendmentId = $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.number', 'E-45/2025')
            ->assertJsonPath('data.status', 'planned');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/amendments?search=E-45/2025')
            ->assertOk()
            ->assertJsonPath('data.data.0.number', 'E-45/2025');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/amendments/{$amendmentId}", [
                'number' => 'E-45/2025',
                'amount' => 650000,
                'status' => 'in_execution',
                'city_id' => $city->id,
                'application_area' => 'Ampliação da unidade de saúde',
            ])
            ->assertOk()
            ->assertJsonPath('data.amount', 650000)
            ->assertJsonPath('data.status', 'in_execution');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/amendments/{$amendmentId}/status", [
                'status' => 'completed',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de Emendas',
            'description' => 'Perfil de teste para emendas.',
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
