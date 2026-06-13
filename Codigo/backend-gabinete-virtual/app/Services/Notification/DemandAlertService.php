<?php

namespace App\Services\Notification;

use App\Jobs\ProcessDemandAlertJob;
use App\Models\Demand;
use App\Models\DemandAlert;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Database\Eloquent\Collection;

class DemandAlertService
{
    /**
     * @param  array<string, mixed>  $changes
     */
    public function createDemandUpdatedAlerts(Demand $demand, array $changes): void
    {
        if ($changes === []) {
            return;
        }

        $title = "Demanda atualizada: {$demand->title}";
        $message = $this->buildMessage($demand, array_keys($changes));
        $metadata = [
            'changed_fields' => array_keys($changes),
        ];

        foreach ($this->systemRecipientIds($demand) as $userId) {
            $alert = DemandAlert::query()->create([
                'demand_id' => $demand->id,
                'user_id' => $userId,
                'title' => $title,
                'message' => $message,
                'type' => 'demand_updated',
                'channel' => DemandAlert::CHANNEL_SYSTEM,
                'status' => DemandAlert::STATUS_PENDING,
                'metadata' => $metadata,
            ]);

            ProcessDemandAlertJob::dispatch($alert->id);
        }

        if ($demand->created_by_citizen_id) {
            $citizen = $demand->citizen;

            if ($citizen && $citizen->receive_demand_updates) {
                $alert = DemandAlert::query()->create([
                    'demand_id' => $demand->id,
                    'citizen_id' => $citizen->id,
                    'title' => $title,
                    'message' => $this->buildCitizenMessage($demand, array_keys($changes)),
                    'type' => 'demand_updated',
                    'channel' => DemandAlert::CHANNEL_CHATBOT,
                    'status' => DemandAlert::STATUS_PENDING,
                    'metadata' => $metadata,
                ]);

                ProcessDemandAlertJob::dispatch($alert->id);
            }
        }
    }

    /**
     * @return Collection<int, DemandAlert>
     */
    public function unreadSystemAlertsForUser(User $user, int $limit = 15): Collection
    {
        return DemandAlert::query()
            ->where('user_id', $user->id)
            ->where('channel', DemandAlert::CHANNEL_SYSTEM)
            ->whereNull('read_at')
            ->latest('created_at')
            ->limit(max(1, min($limit, 50)))
            ->get();
    }

    public function markAsRead(int $alertId, User $user): DemandAlert
    {
        $alert = DemandAlert::query()
            ->where('id', $alertId)
            ->where('user_id', $user->id)
            ->where('channel', DemandAlert::CHANNEL_SYSTEM)
            ->firstOrFail();

        if (! $alert->read_at) {
            $alert->forceFill([
                'read_at' => now(),
            ])->save();
        }

        return $alert;
    }

    /**
     * @return int[]
     */
    private function systemRecipientIds(Demand $demand): array
    {
        $managerIds = User::query()
            ->whereHas('access_profile.permissions', function ($query) {
                $query->where('code', PermissionCodes::DEMANDS_MANAGE);
            })
            ->pluck('id')
            ->all();

        $recipientIds = $managerIds;

        if ($demand->responsible_user_id) {
            $recipientIds[] = (int) $demand->responsible_user_id;
        }

        return array_values(array_unique(array_map('intval', $recipientIds)));
    }

    /**
     * @param  string[]  $fields
     */
    private function buildMessage(Demand $demand, array $fields): string
    {
        $fieldLabels = array_map(
            fn (string $field) => $this->fieldLabel($field),
            $fields,
        );

        return sprintf(
            'A demanda "%s" foi alterada. Campos atualizados: %s.',
            $demand->title,
            implode(', ', $fieldLabels),
        );
    }

    /**
     * @param  string[]  $fields
     */
    private function buildCitizenMessage(Demand $demand, array $fields): string
    {
        $fieldLabels = array_map(
            fn (string $field) => $this->fieldLabel($field),
            $fields,
        );

        return sprintf(
            "Sua demanda \"%s\" foi atualizada.\nCampos alterados: %s.\nStatus atual: %s.",
            $demand->title,
            implode(', ', $fieldLabels),
            $this->statusLabel($demand->status),
        );
    }

    private function fieldLabel(string $field): string
    {
        return match ($field) {
            'title' => 'Título',
            'description' => 'Descrição',
            'service_area' => 'Área atendida',
            'status' => 'Status',
            'priority' => 'Prioridade',
            'responsible_user_id' => 'Responsável',
            'city_id' => 'Cidade',
            'institution_id' => 'Instituição',
            'oficio_original_name' => 'Ofício',
            default => $field,
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'open' => 'Aberta',
            'under_review' => 'Em análise',
            'in_progress' => 'Em andamento',
            'completed' => 'Concluída',
            'discarded' => 'Descartada',
            default => $status,
        };
    }
}
