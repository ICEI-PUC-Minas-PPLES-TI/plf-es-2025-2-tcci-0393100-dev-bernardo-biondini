<?php

namespace App\Http\Requests\ProjectLaw;

use App\Models\ProjectLaw;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectLawStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(ProjectLaw::STATUSES)],
        ];
    }
}
