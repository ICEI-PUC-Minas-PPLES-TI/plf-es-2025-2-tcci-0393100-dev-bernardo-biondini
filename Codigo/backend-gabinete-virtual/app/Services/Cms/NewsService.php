<?php

namespace App\Services\Cms;

use App\Models\News;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class NewsService
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
        return News::query()
            ->with('author:id,name')
            ->orderByDesc('published_at')
            ->limit(max(1, min($limit, 12)))
            ->get();
    }

    public function findById(int $id): News
    {
        return News::query()
            ->with('author:id,name')
            ->findOrFail($id);
    }

    public function create(array $data, int $authorId): News
    {
        $imagePath = $this->storeImage($data['image'] ?? null);

        $news = News::query()->create([
            'title' => $data['title'],
            'content' => $data['content'],
            'published_at' => $data['published_at'],
            'image_path' => $imagePath,
            'author_id' => $authorId,
        ]);

        return $this->findById($news->id);
    }

    public function update(int $id, array $data): News
    {
        $news = News::query()->findOrFail($id);
        $imagePath = $news->getRawOriginal('image_path');

        if (($data['remove_image'] ?? false) && $imagePath) {
            Storage::disk('public')->delete($imagePath);
            $imagePath = null;
        }

        if (($data['image'] ?? null) instanceof UploadedFile) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            $imagePath = $this->storeImage($data['image']);
        }

        $news->update([
            'title' => $data['title'],
            'content' => $data['content'],
            'published_at' => $data['published_at'],
            'image_path' => $imagePath,
        ]);

        return $this->findById($news->id);
    }

    public function delete(int $id): void
    {
        $news = News::query()->findOrFail($id);

        if ($news->getRawOriginal('image_path')) {
            Storage::disk('public')->delete($news->getRawOriginal('image_path'));
        }

        $news->delete();
    }

    private function buildListQuery(array $filters = [])
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $sortBy = in_array($filters['sort_by'] ?? null, ['published_at', 'title', 'created_at'], true)
            ? $filters['sort_by']
            : 'published_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'desc';

        return News::query()
            ->with('author:id,name')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('title', 'like', "%{$search}%")
                        ->orWhereHas('author', function ($authorQuery) use ($search) {
                            $authorQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sortBy, $sortDirection);
    }

    private function storeImage(?UploadedFile $image): ?string
    {
        if (!$image) {
            return null;
        }

        return $image->store('cms/news', 'public');
    }
}
