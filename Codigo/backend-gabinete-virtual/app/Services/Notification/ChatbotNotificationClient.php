<?php

namespace App\Services\Notification;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ChatbotNotificationClient
{
    public function sendCitizenMessage(string $phone, string $message): void
    {
        $response = Http::acceptJson()
            ->withHeaders($this->headers())
            ->post($this->endpoint('/internal/notifications/chatbot-message'), [
                'phone' => $phone,
                'message' => $message,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                $response->json('detail')
                    ?? $response->json('message')
                    ?? 'Nao foi possivel enviar a notificacao pelo chatbot.',
            );
        }
    }

    public function publishSystemAlert(
        int $userId,
        int $alertId,
        string $title,
        string $message,
        string $type = 'demand_alert',
        ?int $demandId = null,
        ?int $eventId = null,
    ): void {
        $response = Http::acceptJson()
            ->withHeaders($this->headers())
            ->post($this->endpoint('/internal/notifications/websocket-alert'), [
                'user_id' => $userId,
                'alert_id' => $alertId,
                'type' => $type,
                'demand_id' => $demandId,
                'event_id' => $eventId,
                'title' => $title,
                'message' => $message,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                $response->json('detail')
                    ?? $response->json('message')
                    ?? 'Nao foi possivel publicar o alerta em tempo real.',
            );
        }
    }

    private function endpoint(string $path): string
    {
        return rtrim((string) config('services.chatbot.service_url'), '/').$path;
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        $token = (string) config('services.chatbot.service_token');

        if ($token === '') {
            throw new RuntimeException('CHATBOT_SERVICE_TOKEN is not configured.');
        }

        return [
            'X-Internal-Token' => $token,
        ];
    }
}
