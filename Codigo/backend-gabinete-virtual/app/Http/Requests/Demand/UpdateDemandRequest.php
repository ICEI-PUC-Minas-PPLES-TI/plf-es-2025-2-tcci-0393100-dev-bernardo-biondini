<?php

namespace App\Http\Requests\Demand;

use App\Support\DemandServiceAreas;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDemandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'service_area' => ['required', 'string', Rule::in(DemandServiceAreas::values())],
            'status' => ['required', Rule::in(['open', 'under_review', 'in_progress', 'completed'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'responsible_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'institution_id' => ['required', 'integer', Rule::exists('institutions', 'id')],
        ];
    }
}
