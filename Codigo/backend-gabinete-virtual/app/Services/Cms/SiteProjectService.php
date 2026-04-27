<?php

namespace App\Services\Cms;

use App\Models\City;
use App\Models\SiteProject;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class SiteProjectService
{
    public function listAdmin(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        return $this->buildListQuery($filters)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function listPublic(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        return $this->buildListQuery($filters)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function latest(int $limit = 3): Collection
    {
        return SiteProject::query()
            ->with([
                'author:id,name',
                'city:id,name,region',
            ])
            ->orderByDesc('created_at')
            ->limit(max(1, min($limit, 12)))
            ->get();
    }

    public function options(): array
    {
        return [
            'site_project_statuses' => $this->statusOptions(),
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'region']),
        ];
    }

    public function findById(int $id): SiteProject
    {
        return SiteProject::query()
            ->with([
                'author:id,name',
                'city:id,name,region',
            ])
            ->findOrFail($id);
    }

    public function create(array $data, int $authorId): SiteProject
    {
        $coverImagePath = $this->storeImage($data['cover_image'] ?? null);

        $siteProject = SiteProject::query()->create([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'city_id' => $data['city_id'],
            'cover_image_path' => $coverImagePath,
            'author_id' => $authorId,
        ]);

        return $this->findById($siteProject->id);
    }

    public function update(int $id, array $data): SiteProject
    {
        $siteProject = SiteProject::query()->findOrFail($id);
        $coverImagePath = $siteProject->getRawOriginal('cover_image_path');

        if (($data['remove_image'] ?? false) && $coverImagePath) {
            Storage::disk('public')->delete($coverImagePath);
            $coverImagePath = null;
        }

        if (($data['cover_image'] ?? null) instanceof UploadedFile) {
            if ($coverImagePath) {
                Storage::disk('public')->delete($coverImagePath);
            }

            $coverImagePath = $this->storeImage($data['cover_image']);
        }

        $siteProject->update([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'city_id' => $data['city_id'],
            'cover_image_path' => $coverImagePath,
        ]);

        return $this->findById($siteProject->id);
    }

    public function delete(int $id): void
    {
        $siteProject = SiteProject::query()->findOrFail($id);

        if ($siteProject->getRawOriginal('cover_image_path')) {
            Storage::disk('public')->delete($siteProject->getRawOriginal('cover_image_path'));
        }

        $siteProject->delete();
    }

    private function buildListQuery(array $filters = [])
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = $filters['status'] ?? null;
        $cityId = $filters['city_id'] ?? null;
        $sortBy = in_array($filters['sort_by'] ?? null, ['created_at', 'title', 'status'], true)
            ? $filters['sort_by']
            : 'created_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'desc';

        return SiteProject::query()
            ->with([
                'author:id,name',
                'city:id,name,region',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where('title', 'like', "%{$search}%");
            })
            ->when($status, function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->when($cityId, function ($query) use ($cityId) {
                $query->where('city_id', $cityId);
            })
            ->orderBy($sortBy, $sortDirection);
    }

    private function statusOptions(): array
    {
        return [
            ['value' => 'planned', 'label' => 'Planejado'],
            ['value' => 'in_progress', 'label' => 'Em andamento'],
            ['value' => 'completed', 'label' => 'Concluido'],
        ];
    }

    private function storeImage(?UploadedFile $image): ?string
    {
        if (!$image) {
            return null;
        }

        return $image->store('cms/site-projects', 'public');
    }
}
