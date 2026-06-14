<?php

namespace App\Http\Requests\Agenda;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;

class ManageAgendaRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::AGENDA_MANAGE);
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'search' => ['nullable', 'string'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'starts_from' => ['nullable', 'date'],
            'ends_to' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $this->filled('starts_from')) {
                        return;
                    }

                    if (strtotime((string) $value) < strtotime((string) $this->input('starts_from'))) {
                        $fail('A data final deve ser maior ou igual a data inicial.');
                    }
                },
            ],
            'sort_by' => ['nullable', 'in:starts_at,title,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
        ];
    }
}
