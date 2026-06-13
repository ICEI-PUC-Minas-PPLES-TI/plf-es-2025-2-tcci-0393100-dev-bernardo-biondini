<?php

namespace App\Http\Requests\Demand;

use App\Models\Demand;
use App\Support\DemandAuthorization;
use Illuminate\Foundation\Http\FormRequest;

class ListDemandHistoriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return DemandAuthorization::canView(
            $this->user(),
            Demand::query()->find($this->route('id')),
        );
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
