<?php

namespace Database\Seeders;

use App\Models\AccessProfile;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CitiesMinasGeraisSeeder::class,
            InstitutionsSeeder::class,
        ]);

        $permissions = [
            ['code' => PermissionCodes::USERS_VIEW, 'description' => 'Visualizar usuarios'],
            ['code' => PermissionCodes::USERS_CREATE, 'description' => 'Cadastrar usuarios'],
            ['code' => PermissionCodes::DEMANDS_MANAGE, 'description' => 'Gerenciar demandas'],
            ['code' => PermissionCodes::AMENDMENTS_MANAGE, 'description' => 'Gerenciar emendas'],
            ['code' => PermissionCodes::PROJECT_LAWS_MANAGE, 'description' => 'Gerenciar projetos de lei'],
            ['code' => PermissionCodes::ROLES_VIEW, 'description' => 'Visualizar papeis'],
            ['code' => PermissionCodes::ROLES_CREATE, 'description' => 'Criar papeis'],
            ['code' => PermissionCodes::ROLES_UPDATE, 'description' => 'Atualizar papeis'],
            ['code' => PermissionCodes::ROLES_DELETE, 'description' => 'Excluir papeis'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(
                ['code' => $permission['code']],
                ['description' => $permission['description']],
            );
        }

        $profile = AccessProfile::query()->firstOrCreate(
            ['name' => 'Administrador'],
            ['description' => 'Perfil com acesso inicial ao sistema.'],
        );

        $profile->permissions()->syncWithoutDetaching(
            Permission::query()->pluck('id')->all(),
        );

        User::query()->firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
            'access_profile_id' => $profile->id,
        ]);
    }
}
