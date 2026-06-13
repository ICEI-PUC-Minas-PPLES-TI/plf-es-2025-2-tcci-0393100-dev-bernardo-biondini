<?php

namespace App\Services\Notification\Channels;

use App\Contracts\DemandAlertChannel;
use App\Models\DemandAlert;
use App\Services\Notification\ChatbotNotificationClient;
use RuntimeException;

class WebSocketDemandAlertChannel implements DemandAlertChannel
{
    public function __construct(private readonly ChatbotNotificationClient $client)
    {
    }

    public function send(DemandAlert $alert): void
    {
        if (! $alert->user_id) {
            throw new RuntimeException('Alerta de sistema sem usuario destinatario.');
        }

        $this->client->publishSystemAlert(
            (int) $alert->user_id,
            (int) $alert->id,
            $alert->title,
            $alert->message,
            demandId: (int) $alert->demand_id,
        );
    }
}
