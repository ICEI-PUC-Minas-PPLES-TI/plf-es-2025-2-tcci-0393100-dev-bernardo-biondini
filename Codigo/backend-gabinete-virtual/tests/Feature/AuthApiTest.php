<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_token(): void
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Atendente',
            'description' => 'Perfil basico.',
        ]);

        Permission::query()->create([
            'code' => 'demands.manage',
            'description' => 'Gerenciar demandas',
        ]);

        $profile->permissions()->sync(Permission::query()->pluck('id')->all());

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Maria',
            'email' => 'maria@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'access_profile_id' => $profile->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'maria@example.com')
            ->assertJsonPath('user.permissions.0', 'demands.manage')
            ->assertJsonStructure([
                'message',
                'token',
                'token_type',
                'user' => ['id', 'name', 'email', 'permissions'],
            ]);
    }

    public function test_user_can_login_fetch_profile_and_logout(): void
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Administrador',
            'description' => 'Perfil administrativo.',
        ]);

        $permission = Permission::query()->create([
            'code' => 'users.view',
            'description' => 'Visualizar usuarios',
        ]);

        $profile->permissions()->attach($permission->id);

        $this->postJson('/api/auth/register', [
            'name' => 'Joao',
            'email' => 'joao@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'access_profile_id' => $profile->id,
        ])->assertCreated();

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'joao@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $loginResponse->assertOk()
            ->assertJsonPath('user.access_profile.name', 'Administrador');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.permissions.0', 'users.view');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk();
    }
}
