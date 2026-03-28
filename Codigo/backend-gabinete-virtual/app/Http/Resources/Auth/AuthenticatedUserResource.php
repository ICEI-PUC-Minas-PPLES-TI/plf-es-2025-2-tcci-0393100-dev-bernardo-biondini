<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'access_profile_id' => $this->access_profile_id,
            'access_profile' => $this->whenLoaded('access_profile', function () {
                return [
                    'id' => $this->access_profile?->id,
                    'name' => $this->access_profile?->name,
                    'description' => $this->access_profile?->description,
                ];
            }),
            'permissions' => $this->permission_codes,
            'created_at' => optional($this->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
        ];
    }
}
