<?php

namespace App\Http\Requests\DemandAlert;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDemandAlertsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['nullable', Rule::in(['unread', 'all'])],
        ];
    }
}
