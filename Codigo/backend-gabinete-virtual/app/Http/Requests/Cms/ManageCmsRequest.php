<?php

namespace App\Http\Requests\Cms;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class ManageCmsRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::CMS_MANAGE);
    }

    public function rules(): array
    {
        return [];
    }
}
