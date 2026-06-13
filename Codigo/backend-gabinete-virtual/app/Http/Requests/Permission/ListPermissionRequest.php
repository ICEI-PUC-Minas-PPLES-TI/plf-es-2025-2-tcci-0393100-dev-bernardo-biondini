<?php

namespace App\Http\Requests\Permission;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class ListPermissionRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::ROLES_VIEW);
    }

    public function rules(): array
    {
        return [];
    }
}
