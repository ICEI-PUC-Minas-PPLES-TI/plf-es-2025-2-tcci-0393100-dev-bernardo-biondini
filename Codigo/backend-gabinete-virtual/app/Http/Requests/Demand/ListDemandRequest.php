<?php

namespace App\Http\Requests\Demand;

use App\Models\Demand;
use App\Support\DemandAuthorization;
use App\Support\DemandServiceAreas;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDemandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return DemandAuthorization::canFilterByResponsible(
            $this->user(),
            $this->filled('responsible_user_id')
                ? $this->integer('responsible_user_id')
                : null,
        );
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'search' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(Demand::STATUSES)],
            'responsible_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'city_id' => ['nullable', 'integer', Rule::exists('cities', 'id')],
            'region' => ['nullable', 'string', 'max:255'],
            'service_area' => ['nullable', 'string', Rule::in(DemandServiceAreas::values())],
            'sort_by' => ['nullable', Rule::in(['title', 'created_at', 'service_area'])],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ];
    }
}
