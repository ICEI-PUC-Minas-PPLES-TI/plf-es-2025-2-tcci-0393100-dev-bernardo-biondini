<?php

namespace Tests\Feature;

use App\Jobs\ProcessDemandAlertJob;
use App\Models\Citizen;
use App\Models\CitizenPhone;
use App\Models\City;
use App\Models\Demand;
use App\Models\DemandAlert;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProcessDemandAlertJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_delivers_system_alert_through_websocket_publisher(): void
    {
        config([
            'services.chatbot.service_url' => 'http://chatbot.test',
            'services.chatbot.service_token' => 'internal-secret',
        ]);

        Http::fake([
            'http://chatbot.test/internal/notifications/websocket-alert' => Http::response([
                'status' => 'published',
            ]),
        ]);

        $city = City::query()->create([
            'name' => 'Contagem',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'UPA',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $user = User::factory()->create();
        $demand = Demand::query()->create([
            'title' => 'Demanda de teste',
            'description' => 'Descricao.',
            'service_area' => 'health',
            'status' => 'open',
            'priority' => 'medium',
            'responsible_user_id' => $user->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
        ]);

        $alert = DemandAlert::query()->create([
            'demand_id' => $demand->id,
            'user_id' => $user->id,
            'title' => 'Demanda atualizada',
            'message' => 'A demanda foi alterada.',
            'type' => 'demand_updated',
            'channel' => DemandAlert::CHANNEL_SYSTEM,
            'status' => DemandAlert::STATUS_PENDING,
        ]);

        (new ProcessDemandAlertJob($alert->id))
            ->handle(app(\App\Services\Notification\DemandAlertChannelFactory::class));

        Http::assertSent(function ($request) use ($alert, $demand, $user) {
            return $request->url() === 'http://chatbot.test/internal/notifications/websocket-alert'
                && $request->hasHeader('X-Internal-Token', 'internal-secret')
                && $request['user_id'] === $user->id
                && $request['alert_id'] === $alert->id
                && $request['demand_id'] === $demand->id;
        });

        $this->assertDatabaseHas('demand_alerts', [
            'id' => $alert->id,
            'status' => DemandAlert::STATUS_SENT,
        ]);
    }

    public function test_job_delivers_chatbot_alert_through_internal_message_sender(): void
    {
        config([
            'services.chatbot.service_url' => 'http://chatbot.test',
            'services.chatbot.service_token' => 'internal-secret',
        ]);

        Http::fake([
            'http://chatbot.test/internal/notifications/chatbot-message' => Http::response([
                'status' => 'sent',
            ]),
        ]);

        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'UBS',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $citizen = Citizen::query()->create([
            'name' => 'Ana',
            'phone' => '(31) 97777-1111',
            'receive_demand_updates' => true,
        ]);
        CitizenPhone::query()->create([
            'citizen_id' => $citizen->id,
            'phone' => '(31) 97777-1111',
            'normalized_phone' => '31977771111',
        ]);
        $demand = Demand::query()->create([
            'title' => 'Demanda de teste',
            'description' => 'Descricao.',
            'service_area' => 'health',
            'status' => 'in_progress',
            'priority' => 'medium',
            'responsible_user_id' => null,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_citizen_id' => $citizen->id,
        ]);

        $alert = DemandAlert::query()->create([
            'demand_id' => $demand->id,
            'citizen_id' => $citizen->id,
            'title' => 'Demanda atualizada',
            'message' => 'Sua demanda foi atualizada.',
            'type' => 'demand_updated',
            'channel' => DemandAlert::CHANNEL_CHATBOT,
            'status' => DemandAlert::STATUS_PENDING,
        ]);

        (new ProcessDemandAlertJob($alert->id))
            ->handle(app(\App\Services\Notification\DemandAlertChannelFactory::class));

        Http::assertSent(function ($request) {
            return $request->url() === 'http://chatbot.test/internal/notifications/chatbot-message'
                && $request->hasHeader('X-Internal-Token', 'internal-secret')
                && $request['phone'] === '(31) 97777-1111'
                && $request['message'] === 'Sua demanda foi atualizada.';
        });

        $this->assertDatabaseHas('demand_alerts', [
            'id' => $alert->id,
            'status' => DemandAlert::STATUS_SENT,
        ]);
    }
}
