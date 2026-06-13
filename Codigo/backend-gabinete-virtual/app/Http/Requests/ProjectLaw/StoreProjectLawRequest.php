<?php

namespace App\Http\Requests\ProjectLaw;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\ProjectLaw;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectLawRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::PROJECT_LAWS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'number' => ['required', 'string', 'max:255', 'unique:project_laws,number'],
            'description' => ['required', 'string'],
            'status' => ['required', Rule::in(ProjectLaw::STATUSES)],
            'protocol_date' => ['required', 'date'],
        ];
    }
}
