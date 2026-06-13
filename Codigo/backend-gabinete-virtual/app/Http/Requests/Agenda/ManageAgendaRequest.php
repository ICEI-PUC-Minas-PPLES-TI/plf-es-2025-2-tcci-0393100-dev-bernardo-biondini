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
        return [];
    }
}
