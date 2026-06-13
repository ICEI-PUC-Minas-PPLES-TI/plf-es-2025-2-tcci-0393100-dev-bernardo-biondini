<?php

namespace App\Http\Requests\Amendment;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\Amendment;
use App\Support\AmendmentApplicationAreas;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAmendmentRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::AMENDMENTS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'number' => ['required', 'string', 'max:255', 'unique:amendments,number'],
            'amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(Amendment::STATUSES)],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'application_area' => ['required', 'string', Rule::in(AmendmentApplicationAreas::values())],
        ];
    }
}
