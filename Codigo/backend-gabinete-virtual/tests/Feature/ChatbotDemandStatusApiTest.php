<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatbotDemandStatusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_chatbot_can_check_status_of_a_specific_demand(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $responsibleUser = User::factory()->create();
        $city = City::query()->create([
            'name' => 'Contagem',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Prefeitura de Contagem',
            'type' => 'Prefeitura',
            'city_id' => $city->id,
        ]);
        $demand = Demand::query()->create([
            'title' => 'Solicitação de pavimentação',
            'description' => 'Pavimentar a rua principal do bairro.',
            'status' => 'in_progress',
            'priority' => 'high',
            'responsible_user_id' => $responsibleUser->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => $responsibleUser->id,
            'created_by_citizen_id' => null,
        ]);

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson("/api/chatbot/demands/{$demand->id}/status")
            ->assertOk()
            ->assertJsonPath('data.id', $demand->id)
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.status_label', 'Em andamento');
    }

    public function test_chatbot_status_route_requires_internal_token(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $this->getJson('/api/chatbot/demands/1/status')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Token interno do chatbot invalido.');
    }
}
