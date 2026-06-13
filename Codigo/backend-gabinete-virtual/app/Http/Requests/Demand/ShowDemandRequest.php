<?php

namespace App\Http\Requests\Demand;

use App\Models\Demand;
use App\Support\DemandAuthorization;
use Illuminate\Foundation\Http\FormRequest;

class ShowDemandRequest extends FormRequest
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
        return [];
    }
}
