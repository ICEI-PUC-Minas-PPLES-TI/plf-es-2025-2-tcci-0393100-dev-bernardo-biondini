<?php

namespace App\Http\Requests\Amendment;

use App\Models\Amendment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmendmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'number' => [
                'required',
                'string',
                'max:255',
                Rule::unique('amendments', 'number')->ignore($this->route('id')),
            ],
            'amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(Amendment::STATUSES)],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'application_area' => ['required', 'string'],
        ];
    }
}
