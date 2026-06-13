<?php

namespace App\Http\Requests\ProjectLaw;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\ProjectLaw;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectLawStatusRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::PROJECT_LAWS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(ProjectLaw::STATUSES)],
        ];
    }
}
