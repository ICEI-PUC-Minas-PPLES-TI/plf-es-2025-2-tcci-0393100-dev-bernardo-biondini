<?php

namespace App\Http\Requests\Cms;

use App\Models\SiteProject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StoreSiteProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
