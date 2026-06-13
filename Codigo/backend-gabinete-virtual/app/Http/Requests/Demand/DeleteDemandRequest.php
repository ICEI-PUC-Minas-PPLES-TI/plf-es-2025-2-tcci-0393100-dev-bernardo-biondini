<?php

namespace App\Http\Requests\Demand;

use App\Support\DemandAuthorization;
use Illuminate\Foundation\Http\FormRequest;

class DeleteDemandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return DemandAuthorization::canManage($this->user());
    }

    public function rules(): array
    {
        return [];
    }
}
