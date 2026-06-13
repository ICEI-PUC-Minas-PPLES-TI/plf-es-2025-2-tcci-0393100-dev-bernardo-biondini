<?php

namespace App\Http\Requests\Amendment;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\Amendment;
use App\Support\AmendmentApplicationAreas;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ManageAmendmentRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::AMENDMENTS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(Amendment::STATUSES)],
            'city_id' => ['nullable', 'integer', Rule::exists('cities', 'id')],
            'application_area' => ['nullable', 'string', Rule::in(AmendmentApplicationAreas::values())],
            'sort_by' => ['nullable', Rule::in(['number', 'amount', 'created_at'])],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
