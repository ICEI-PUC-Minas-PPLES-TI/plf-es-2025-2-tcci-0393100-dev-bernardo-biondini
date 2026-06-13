<?php

namespace App\Http\Requests\Cms;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreNewsRequest extends FormRequest
{
    use AuthorizesPermission;

    public function authorize(): bool
    {
        return $this->authorizePermission(PermissionCodes::CMS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'published_at' => ['required', 'date'],
            'image' => ['nullable', File::image()->max(5 * 1024)],
        ];
    }
}
