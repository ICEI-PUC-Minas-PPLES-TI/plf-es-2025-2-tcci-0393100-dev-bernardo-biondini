<?php

namespace App\Http\Requests\AccessProfile;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class DeleteAccessProfileRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::ROLES_DELETE);
    }

    public function rules(): array
    {
        return [];
    }
}
