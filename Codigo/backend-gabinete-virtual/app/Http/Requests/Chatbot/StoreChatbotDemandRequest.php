<?php

namespace App\Http\Requests\Chatbot;

use App\Support\DemandServiceAreas;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChatbotDemandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'can_create' => ['required', 'boolean'],
            'reason' => [
                Rule::requiredIf(fn () => ! $this->boolean('can_create')),
                'nullable',
                'string',
                'max:100',
            ],
            'message' => [
                Rule::requiredIf(fn () => ! $this->boolean('can_create')),
                'nullable',
                'string',
            ],
            'demanda' => ['required', 'array'],
            'demanda.citizen_name' => ['required', 'string', 'max:255'],
            'demanda.phone' => ['required', 'string', 'max:40'],
            'demanda.title' => ['required', 'string', 'max:255'],
            'demanda.description' => ['required', 'string'],
            'demanda.service_area' => ['nullable', 'string', Rule::in(DemandServiceAreas::values())],
            'demanda.priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'demanda.city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'demanda.institution_id' => [
                'nullable',
                'integer',
                Rule::exists('institutions', 'id')->where(
                    fn ($query) => $query->where(
                        'city_id',
                        data_get($this->input('demanda'), 'city_id'),
                    ),
                ),
            ],
        ];
    }
}
