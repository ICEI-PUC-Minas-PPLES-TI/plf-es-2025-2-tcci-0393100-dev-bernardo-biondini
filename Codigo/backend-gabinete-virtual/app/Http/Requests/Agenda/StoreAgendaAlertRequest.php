<?php

namespace App\Http\Requests\Agenda;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgendaAlertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_id' => ['nullable', 'integer', Rule::exists('events', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string'],
            'alert_at' => ['required', 'date'],
            'lead_time_minutes' => ['nullable', 'integer', 'min:0'],
            'channel' => ['required', Rule::in(['email', 'system'])],
            'is_recurring' => ['nullable', 'boolean'],
        ];
    }
}
