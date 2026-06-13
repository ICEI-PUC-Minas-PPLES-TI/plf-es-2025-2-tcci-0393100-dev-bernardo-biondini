<?php

namespace App\Http\Requests\ProjectLaw;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class ManageProjectLawRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::PROJECT_LAWS_MANAGE);
    }

    public function rules(): array
    {
        return [];
    }
}
