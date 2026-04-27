<?php

namespace App\Http\Requests\Agenda;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgendaEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['meeting', 'audience', 'visit', 'session', 'other'])],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'location' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'participants_expected' => ['nullable', 'integer', 'min:1'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'city_id' => ['nullable', 'integer', Rule::exists('cities', 'id')],
            'demand_ids' => ['nullable', 'array'],
            'demand_ids.*' => ['integer', Rule::exists('demands', 'id')],
        ];
    }
}
