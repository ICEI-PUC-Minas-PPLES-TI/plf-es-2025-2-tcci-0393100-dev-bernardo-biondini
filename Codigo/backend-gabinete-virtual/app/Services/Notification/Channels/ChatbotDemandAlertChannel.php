<?php

namespace App\Services\Notification\Channels;

use App\Contracts\DemandAlertChannel;
use App\Models\DemandAlert;
use App\Services\Notification\ChatbotNotificationClient;
use RuntimeException;

class ChatbotDemandAlertChannel implements DemandAlertChannel
{
    public function __construct(private readonly ChatbotNotificationClient $client)
    {
    }

    public function send(DemandAlert $alert): void
    {
        $citizen = $alert->citizen()->with('primaryPhone')->first();
        $phone = $citizen?->primaryPhone?->phone ?? $citizen?->phone;

        if (! $phone) {
            throw new RuntimeException('Cidadao sem telefone para receber notificacao.');
        }

        $this->client->sendCitizenMessage($phone, $alert->message);
    }
}
