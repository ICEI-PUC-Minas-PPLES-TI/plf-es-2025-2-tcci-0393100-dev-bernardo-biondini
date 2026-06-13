<?php

namespace App\Http\Requests\Cms;

use App\Http\Requests\Concerns\AuthorizesPermission;
use App\Models\SiteProject;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StoreSiteProjectRequest extends FormRequest
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
            'description' => ['required', 'string'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'status' => ['required', Rule::in(SiteProject::STATUSES)],
            'cover_image' => ['nullable', File::image()->max(5 * 1024)],
        ];
    }
}
