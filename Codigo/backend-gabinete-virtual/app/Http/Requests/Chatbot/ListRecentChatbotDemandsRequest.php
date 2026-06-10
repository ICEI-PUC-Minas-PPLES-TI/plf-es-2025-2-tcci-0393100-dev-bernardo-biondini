<?php

namespace App\Http\Requests\Chatbot;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListRecentChatbotDemandsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'city_id' => ['required', 'integer', Rule::exists('cities', 'id')],
            'months' => ['nullable', 'integer', 'min:1', 'max:12'],
        ];
    }
}
