<?php

namespace App\Http\Requests\Chatbot;

use Illuminate\Foundation\Http\FormRequest;

class StoreChatbotCitizenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'receive_demand_updates' => ['required', 'boolean'],
        ];
    }
}
