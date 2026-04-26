<?php

namespace App\Services\ProjectLaw;

use App\Models\ProjectLaw;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProjectLawService
{
    public function list(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = $filters['status'] ?? null;
        $sortBy = in_array($filters['sort_by'] ?? null, ['number', 'protocol_date', 'created_at'], true)
            ? $filters['sort_by']
            : 'created_at';
        $sortDirection = in_array($filters['sort_direction'] ?? null, ['asc', 'desc'], true)
            ? $filters['sort_direction']
            : 'desc';

        return ProjectLaw::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('number', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($status, function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();
    }

    public function options(): array
    {
        return [
            'statuses' => $this->statusOptions(),
        ];
    }

    public function findById(int $id): ProjectLaw
    {
        return ProjectLaw::query()->findOrFail($id);
    }

    public function create(array $data): ProjectLaw
    {
        $projectLaw = ProjectLaw::query()->create([
            'number' => $data['number'],
            'description' => $data['description'],
            'status' => $data['status'],
            'protocol_date' => $data['protocol_date'],
        ]);

        return $this->findById($projectLaw->id);
    }

    public function update(int $id, array $data): ProjectLaw
    {
        $projectLaw = ProjectLaw::query()->findOrFail($id);

        $projectLaw->update([
            'number' => $data['number'],
            'description' => $data['description'],
            'status' => $data['status'],
            'protocol_date' => $data['protocol_date'],
        ]);

        return $this->findById($projectLaw->id);
    }

    public function updateStatus(int $id, string $status): ProjectLaw
    {
        $projectLaw = ProjectLaw::query()->findOrFail($id);

        $projectLaw->update([
            'status' => $status,
        ]);

        return $this->findById($projectLaw->id);
    }

    public function delete(int $id): void
    {
        $projectLaw = ProjectLaw::query()->findOrFail($id);
        $projectLaw->delete();
    }

    private function statusOptions(): array
    {
        return [
            ['value' => 'in_committee', 'label' => 'Em comissão'],
            ['value' => 'in_voting', 'label' => 'Em votação'],
            ['value' => 'approved', 'label' => 'Aprovado'],
            ['value' => 'sanctioned', 'label' => 'Sancionado'],
        ];
    }
}
