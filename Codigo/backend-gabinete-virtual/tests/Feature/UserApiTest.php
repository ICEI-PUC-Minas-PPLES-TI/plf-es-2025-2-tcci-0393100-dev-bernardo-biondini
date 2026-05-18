<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\Permission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    public function test_user_can_list_permissions_and_manage_users(): void
    {
        $session = $this->issueAuthenticatedSession([
            PermissionCodes::ROLES_VIEW,
            PermissionCodes::USERS_VIEW,
            PermissionCodes::USERS_CREATE,
        ]);

        Permission::query()->create([
            'code' => PermissionCodes::CMS_MANAGE,
            'description' => 'Gerenciar cms',
        ]);

        $targetProfile = AccessProfile::query()->create([
            'name' => 'Atendente',
            'description' => 'Atendimento inicial.',
        ]);

        $this->withHeader('Authorization', 'Bearer '. $session['token'])
            ->getJson('/api/permissions')
            ->assertOk()
            ->assertJsonFragment([
                'code' => PermissionCodes::CMS_MANAGE,
            ]);

        $createResponse = $this->withHeader('Authorization', 'Bearer '. $session['token'])
            ->postJson('/api/users', [
                'name' => 'Laura Martins',
                'email' => 'laura@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'access_profile_id' => $targetProfile->id,
            ]);

        $createdUserId = (int) $createResponse->json('data.id');

        $createResponse->assertCreated()
            ->assertJsonPath('data.email', 'laura@example.com')
            ->assertJsonPath('data.access_profile.id', $targetProfile->id);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/users?search=laura')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $createdUserId,
                'email' => 'laura@example.com',
            ]);
    }
}
