<?php

namespace Tests\Concerns;

use App\Models\AccessProfile;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Str;

trait AuthenticatesApiUsers
{
    /**
     * @param  list<string>  $permissionCodes
     * @return array{user: User, token: string}
     */
    protected function issueAuthenticatedSession(array $permissionCodes = []): array
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Perfil '.Str::random(8),
            'description' => 'Perfil para testes de API.',
        ]);

        $permissionIds = [];

        foreach ($permissionCodes as $permissionCode) {
            $permissionIds[] = Permission::query()->create([
                'code' => $permissionCode,
                'description' => $permissionCode,
            ])->id;
        }

        if ($permissionIds !== []) {
            $profile->permissions()->sync($permissionIds);
        }

        $user = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => 'test',
            'token' => hash('sha256', $plainTextToken),
        ]);

        return [
            'user' => $user,
            'token' => $plainTextToken,
        ];
    }
}
