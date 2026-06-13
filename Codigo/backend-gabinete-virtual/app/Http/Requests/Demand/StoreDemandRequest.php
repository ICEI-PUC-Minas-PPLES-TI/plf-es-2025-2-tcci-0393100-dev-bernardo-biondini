<?php

namespace App\Http\Requests\Demand;

use App\Models\Demand;
use App\Support\DemandAuthorization;
use App\Support\DemandServiceAreas;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StoreDemandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return DemandAuthorization::canManage($this->user());
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'service_area' => ['required', 'string', Rule::in(DemandServiceAreas::values())],
            'status' => ['required', Rule::in(Demand::STATUSES)],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'responsible_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'institution_id' => ['required', 'integer', Rule::exists('institutions', 'id')],
            'oficio' => [
                'nullable',
                File::types(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'csv'])
                    ->max(10 * 1024),
            ],
        ];
    }
}
