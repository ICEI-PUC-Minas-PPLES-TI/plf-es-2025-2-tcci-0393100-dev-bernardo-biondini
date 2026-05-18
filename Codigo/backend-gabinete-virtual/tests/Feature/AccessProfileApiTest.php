<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class AccessProfileApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    public function test_user_can_manage_access_profiles_and_permissions_listing(): void
    {
        $session = $this->issueAuthenticatedSession([
            PermissionCodes::ROLES_VIEW,
            PermissionCodes::ROLES_CREATE,
            PermissionCodes::ROLES_UPDATE,
            PermissionCodes::ROLES_DELETE,
        ]);

        $permission = Permission::query()->create([
            'code' => PermissionCodes::USERS_VIEW,
            'description' => 'Visualizar usuarios',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/permissions')
            ->assertOk()
            ->assertJsonFragment([
                'code' => PermissionCodes::USERS_VIEW,
            ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->postJson('/api/roles', [
                'name' => 'Coordenador',
                'description' => 'Acompanha equipes.',
                'permission_ids' => [$permission->id],
            ]);

        $roleId = (int) $response->json('data.id');

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Coordenador')
            ->assertJsonPath('data.permissions.0.id', $permission->id);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/access-profiles')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $roleId);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/roles')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $roleId);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson("/api/roles/{$roleId}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Coordenador');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->putJson("/api/roles/{$roleId}", [
                'name' => 'Coordenador Geral',
                'description' => 'Acompanha e define prioridades.',
                'permission_ids' => [$permission->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Coordenador Geral');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->deleteJson("/api/roles/{$roleId}")
            ->assertOk()
            ->assertJsonPath('message', 'Papel removido com sucesso.');

        $this->assertDatabaseMissing('access_profiles', ['id' => $roleId]);
    }
}
