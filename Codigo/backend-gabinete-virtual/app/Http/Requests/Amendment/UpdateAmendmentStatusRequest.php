<?php

namespace App\Http\Requests\Amendment;

use App\Models\Amendment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmendmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(Amendment::STATUSES)],
        ];
    }
}
