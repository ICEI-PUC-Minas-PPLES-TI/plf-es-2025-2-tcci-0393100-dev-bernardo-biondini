<?php

namespace App\Services\Auth;

use App\Models\AccessProfile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AccessProfileService
{
    public function list(int $perPage = 10): LengthAwarePaginator
    {
        return AccessProfile::query()
            ->with(['permissions:id,code,description'])
            ->orderBy('name')
            ->paginate($perPage, ['id', 'name', 'description']);
    }

    public function findById(int $id): AccessProfile
    {
        return AccessProfile::query()
            ->with(['permissions:id,code,description'])
            ->findOrFail($id);
    }

    public function create(array $data): AccessProfile
    {
        $accessProfile = AccessProfile::query()->create([
            'name' => $data['name'],
            'description' => $data['description'],
        ]);

        $accessProfile->permissions()->sync($data['permission_ids'] ?? []);

        return $this->findById($accessProfile->id);
    }

    public function update(int $id, array $data): AccessProfile
    {
        $accessProfile = AccessProfile::query()->findOrFail($id);

        $accessProfile->update([
            'name' => $data['name'],
            'description' => $data['description'],
        ]);

        $accessProfile->permissions()->sync($data['permission_ids'] ?? []);

        return $this->findById($accessProfile->id);
    }

    public function delete(int $id): void
    {
        $accessProfile = AccessProfile::query()->findOrFail($id);

        $accessProfile->delete();
    }
}
