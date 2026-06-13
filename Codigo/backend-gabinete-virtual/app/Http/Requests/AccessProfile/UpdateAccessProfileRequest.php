<?php

namespace App\Http\Requests\AccessProfile;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccessProfileRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::ROLES_UPDATE);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('access_profiles', 'name')->ignore($this->route('id')),
            ],
            'description' => ['required', 'string', 'max:255'],
            'permission_ids' => ['nullable', 'array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ];
    }
}
