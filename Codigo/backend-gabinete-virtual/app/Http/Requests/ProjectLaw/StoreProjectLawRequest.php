<?php

namespace App\Http\Requests\ProjectLaw;

use App\Models\ProjectLaw;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectLawRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
