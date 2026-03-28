<?php

namespace App\Services\User;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function list(int $perPage = 10): LengthAwarePaginator
    {
        return User::query()
            ->with(['access_profile:id,name,description'])
            ->orderBy('name')
            ->paginate($perPage, [
                'id',
                'name',
                'email',
                'access_profile_id',
                'created_at',
                'updated_at',
            ]);
    }

    public function create(array $data): User
    {
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'access_profile_id' => $data['access_profile_id'],
        ]);

        return $user->load(['access_profile:id,name,description']);
    }
}
