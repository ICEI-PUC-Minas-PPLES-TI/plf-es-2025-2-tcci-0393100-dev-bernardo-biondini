<?php

namespace App\Http\Requests\Amendment;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\Amendment;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmendmentStatusRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::AMENDMENTS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(Amendment::STATUSES)],
        ];
    }
}
