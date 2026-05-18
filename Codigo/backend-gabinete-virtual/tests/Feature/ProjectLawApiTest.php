<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectLawApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_project_laws(): void
    {
        $token = $this->issueTokenForPermission(PermissionCodes::PROJECT_LAWS_MANAGE);

        $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/project-laws', [
                'number' => 'PL 234/2025',
                'description' => 'Incentivo à agricultura familiar',
                'status' => 'in_committee',
                'protocol_date' => '2025-03-14',
            ]);

        $projectLawId = $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.number', 'PL 234/2025')
            ->assertJsonPath('data.status', 'in_committee');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/project-laws/options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['statuses']]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/project-laws?search=PL 234/2025')
            ->assertOk()
            ->assertJsonPath('data.data.0.number', 'PL 234/2025');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/project-laws/{$projectLawId}", [
                'number' => 'PL 234/2025',
                'description' => 'Programa de incentivo à agricultura familiar',
                'status' => 'in_voting',
                'protocol_date' => '2025-03-14',
            ])
            ->assertOk()
            ->assertJsonPath('data.description', 'Programa de incentivo à agricultura familiar')
            ->assertJsonPath('data.status', 'in_voting');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/project-laws/{$projectLawId}/status", [
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/project-laws/{$projectLawId}")
            ->assertOk()
            ->assertJsonPath('data.id', $projectLawId)
            ->assertJsonPath('data.status', 'approved');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/project-laws/{$projectLawId}")
            ->assertOk()
            ->assertJsonPath('message', 'Projeto de lei removido com sucesso.');

        $this->assertDatabaseMissing('project_laws', ['id' => $projectLawId]);
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de PLs',
            'description' => 'Perfil de teste para projetos de lei.',
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
