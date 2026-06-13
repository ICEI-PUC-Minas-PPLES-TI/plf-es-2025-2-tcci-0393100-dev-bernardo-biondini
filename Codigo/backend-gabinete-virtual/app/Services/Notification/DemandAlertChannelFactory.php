<?php

namespace App\Services\Notification;

use App\Contracts\DemandAlertChannel;
use App\Models\DemandAlert;
use App\Services\Notification\Channels\ChatbotDemandAlertChannel;
use App\Services\Notification\Channels\WebSocketDemandAlertChannel;
use InvalidArgumentException;

class DemandAlertChannelFactory
{
    public function __construct(
        private readonly ChatbotDemandAlertChannel $chatbotChannel,
        private readonly WebSocketDemandAlertChannel $webSocketChannel,
    ) {
    }

    public function make(string $channel): DemandAlertChannel
    {
        return match ($channel) {
            DemandAlert::CHANNEL_CHATBOT => $this->chatbotChannel,
            DemandAlert::CHANNEL_SYSTEM => $this->webSocketChannel,
            default => throw new InvalidArgumentException("Canal de alerta desconhecido: {$channel}"),
        };
    }
}
