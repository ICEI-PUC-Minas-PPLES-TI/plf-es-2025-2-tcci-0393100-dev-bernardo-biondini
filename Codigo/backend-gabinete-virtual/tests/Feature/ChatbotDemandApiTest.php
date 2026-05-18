<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\City;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatbotDemandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_chatbot_can_list_options_and_create_demand(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);

        $institution = Institution::query()->create([
            'name' => 'UBS Central',
            'type' => 'Saude',
            'city_id' => $city->id,
        ]);

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson('/api/chatbot/demand-options')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'service_areas',
                    'cities',
                    'institutions',
                ],
            ]);

        $response = $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/demands', [
                'citizen_name' => 'Carlos Silva',
                'phone' => '(31) 99999-1111',
                'title' => 'Pedido de manutencao da rua',
                'description' => 'Necessidade de reparo urgente em via publica.',
                'service_area' => 'infrastructure',
                'priority' => 'high',
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ]);

        $citizenId = (int) Citizen::query()->where('phone', '(31) 99999-1111')->value('id');

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Pedido de manutencao da rua')
            ->assertJsonPath('data.city.id', $city->id)
            ->assertJsonPath('data.created_by_citizen_id', $citizenId);
    }

    public function test_chatbot_routes_fail_when_internal_token_is_not_configured(): void
    {
        config(['services.chatbot.internal_token' => null]);

        $this->getJson('/api/chatbot/demand-options')
            ->assertStatus(500)
            ->assertJsonPath('message', 'Token interno do chatbot nao configurado.');
    }
}
