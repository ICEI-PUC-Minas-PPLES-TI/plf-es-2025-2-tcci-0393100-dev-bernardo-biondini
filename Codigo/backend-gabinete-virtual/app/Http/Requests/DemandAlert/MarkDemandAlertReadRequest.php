<?php

namespace App\Http\Requests\DemandAlert;

use Illuminate\Foundation\Http\FormRequest;

class MarkDemandAlertReadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [];
    }
}
