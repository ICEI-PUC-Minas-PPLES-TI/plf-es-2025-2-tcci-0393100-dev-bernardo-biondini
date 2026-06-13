<?php

namespace App\Http\Requests\User;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class ListUserRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::USERS_VIEW);
    }

    public function rules(): array
    {
        return [];
    }
}
