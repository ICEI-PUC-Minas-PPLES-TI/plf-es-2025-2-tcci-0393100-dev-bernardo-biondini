<?php

namespace Tests\Feature;

use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class AuthorizationApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    public function test_protected_routes_require_authentication(): void
    {
        $this->getJson('/api/dashboard')
            ->assertStatus(500)
            ->assertJsonPath('exception', 'Illuminate\\Auth\\AuthenticationException');
        $this->getJson('/api/demands')->assertStatus(500);
        $this->getJson('/api/roles')->assertStatus(500);
        $this->getJson('/api/users')->assertStatus(500);
        $this->getJson('/api/permissions')->assertStatus(500);
        $this->getJson('/api/cms/sections')->assertStatus(500);
    }

    public function test_routes_with_permission_middleware_return_forbidden_without_permission(): void
    {
        $session = $this->issueAuthenticatedSession();

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/permissions')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->postJson('/api/roles', [
                'name' => 'Supervisor',
                'description' => 'Sem permissao para criar.',
                'permission_ids' => [],
            ])
            ->assertForbidden();
    }

    public function test_authenticated_route_without_permission_middleware_is_accessible(): void
    {
        $session = $this->issueAuthenticatedSession([PermissionCodes::DEMANDS_MANAGE]);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['summary']]);
    }
}
