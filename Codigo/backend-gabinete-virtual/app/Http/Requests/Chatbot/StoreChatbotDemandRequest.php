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
            'citizen_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'service_area' => ['nullable', 'string', Rule::in(DemandServiceAreas::values())],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'institution_id' => [
                'required',
                'integer',
                Rule::exists('institutions', 'id')->where(
                    fn ($query) => $query->where('city_id', $this->integer('city_id')),
                ),
            ],
        ];
    }
}
