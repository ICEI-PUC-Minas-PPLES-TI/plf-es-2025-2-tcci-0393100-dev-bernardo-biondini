<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\CitizenPhone;
use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatbotDemandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_chatbot_can_lookup_and_register_citizen_by_phone(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $citizen = Citizen::query()->create([
            'name' => 'Carlos Silva',
            'cpf' => null,
            'birth_date' => null,
            'phone' => '(31) 99999-1111',
            'receive_demand_updates' => true,
        ]);

        CitizenPhone::query()->create([
            'citizen_id' => $citizen->id,
            'phone' => '(31) 99999-1111',
            'normalized_phone' => '31999991111',
        ]);

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson('/api/chatbot/citizens/lookup?phone=55 31 99999-1111')
            ->assertOk()
            ->assertJsonPath('data.id', $citizen->id)
            ->assertJsonPath('data.name', 'Carlos Silva')
            ->assertJsonPath('data.receive_demand_updates', true);

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/citizens', [
                'name' => 'Ana Souza',
                'phone' => '(31) 98888-2222',
                'receive_demand_updates' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ana Souza')
            ->assertJsonPath('data.receive_demand_updates', false);

        $this->assertDatabaseHas('citizen_phones', [
            'phone' => '(31) 98888-2222',
            'normalized_phone' => '31988882222',
        ]);
    }

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
        $secondCity = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);

        $secondInstitution = Institution::query()->create([
            'name' => 'Camara Municipal de Belo Horizonte',
            'type' => 'Legislativo',
            'city_id' => $secondCity->id,
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

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson('/api/chatbot/cities?query=Be&limit=5')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Belo Horizonte');

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson("/api/chatbot/cities/{$secondCity->id}/institutions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondInstitution->id);

        $citizenResponse = $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/citizens', [
                'name' => 'Carlos Silva',
                'phone' => '(31) 99999-1111',
                'receive_demand_updates' => true,
            ]);

        $citizenId = (int) $citizenResponse->json('data.id');

        $response = $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/demands', [
                'can_create' => true,
                'reason' => null,
                'message' => null,
                'demanda' => [
                    'citizen_id' => $citizenId,
                    'title' => 'Pedido de manutencao da rua',
                    'description' => 'Necessidade de reparo urgente em via publica.',
                    'service_area' => 'infrastructure',
                    'priority' => 'high',
                    'city_id' => $city->id,
                    'institution_id' => $institution->id,
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Pedido de manutencao da rua')
            ->assertJsonPath('data.city.id', $city->id)
            ->assertJsonPath('data.status', 'under_review')
            ->assertJsonPath('data.created_by_citizen_id', $citizenId);
    }

    public function test_chatbot_can_create_discarded_demand_with_validation_context(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $city = City::query()->create([
            'name' => 'Contagem',
            'region' => 'Metropolitana',
        ]);

        $institution = Institution::query()->create([
            'name' => 'UBS Industrial',
            'type' => 'Saude',
            'city_id' => $city->id,
        ]);

        $citizen = Citizen::query()->create([
            'name' => 'Ana Souza',
            'cpf' => null,
            'birth_date' => null,
            'phone' => '(31) 98888-2222',
            'receive_demand_updates' => false,
        ]);

        CitizenPhone::query()->create([
            'citizen_id' => $citizen->id,
            'phone' => '(31) 98888-2222',
            'normalized_phone' => '31988882222',
        ]);

        $response = $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/demands', [
                'can_create' => false,
                'reason' => 'invalid_language',
                'message' => 'Idioma identificado nao e portugues, mas Ingles.',
                'demanda' => [
                    'citizen_id' => $citizen->id,
                    'title' => 'Need help',
                    'description' => 'Need help with healthcare support.',
                    'service_area' => 'health',
                    'priority' => null,
                    'city_id' => $city->id,
                    'institution_id' => $institution->id,
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'discarded')
            ->assertJsonPath('data.discard_message', 'Idioma identificado nao e portugues, mas Ingles.');

        $this->assertDatabaseHas('demands', [
            'title' => 'Need help',
            'status' => 'discarded',
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'discard_message' => 'Idioma identificado nao e portugues, mas Ingles.',
        ]);

        $this->assertDatabaseHas('demand_histories', [
            'demand_id' => $response->json('data.id'),
            'action' => 'created',
            'description' => 'Demanda descartada automaticamente pelo chatbot.',
        ]);
    }

    public function test_chatbot_can_create_demand_without_institution(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);

        $citizen = Citizen::query()->create([
            'name' => 'Bruna Lima',
            'cpf' => null,
            'birth_date' => null,
            'phone' => '(31) 97777-1111',
            'receive_demand_updates' => true,
        ]);

        CitizenPhone::query()->create([
            'citizen_id' => $citizen->id,
            'phone' => '(31) 97777-1111',
            'normalized_phone' => '31977771111',
        ]);

        $response = $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->postJson('/api/chatbot/demands', [
                'can_create' => true,
                'reason' => null,
                'message' => null,
                'demanda' => [
                    'citizen_id' => $citizen->id,
                    'title' => 'Demanda sem instituicao',
                    'description' => 'Registro feito apenas com a cidade informada.',
                    'service_area' => 'social_assistance',
                    'priority' => null,
                    'city_id' => $city->id,
                    'institution_id' => null,
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.city.id', $city->id)
            ->assertJsonPath('data.institution', null);

        $this->assertDatabaseHas('demands', [
            'title' => 'Demanda sem instituicao',
            'city_id' => $city->id,
            'institution_id' => null,
        ]);
    }

    public function test_chatbot_can_list_recent_open_demands_for_similarity(): void
    {
        config(['services.chatbot.internal_token' => 'chatbot-secret']);

        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);

        $institution = Institution::query()->create([
            'name' => 'Prefeitura de Betim',
            'type' => 'Prefeitura',
            'city_id' => $city->id,
        ]);

        Demand::query()->create([
            'title' => 'Buraco na rua principal',
            'description' => 'Solicitacao de reparo urgente em via publica.',
            'service_area' => 'infrastructure',
            'status' => 'open',
            'priority' => 'high',
            'responsible_user_id' => null,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => null,
            'created_by_citizen_id' => null,
            'created_at' => Carbon::now()->subMonth(),
            'updated_at' => Carbon::now()->subMonth(),
        ]);

        Demand::query()->create([
            'title' => 'Demanda antiga',
            'description' => 'Nao deve aparecer por estar fora da janela.',
            'service_area' => 'infrastructure',
            'status' => 'under_review',
            'priority' => 'medium',
            'responsible_user_id' => null,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => null,
            'created_by_citizen_id' => null,
            'created_at' => Carbon::now()->subMonths(4),
            'updated_at' => Carbon::now()->subMonths(4),
        ]);

        Demand::query()->create([
            'title' => 'Demanda concluida',
            'description' => 'Nao deve aparecer por estar concluida.',
            'service_area' => 'infrastructure',
            'status' => 'completed',
            'priority' => 'low',
            'responsible_user_id' => null,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => null,
            'created_by_citizen_id' => null,
            'created_at' => Carbon::now()->subWeek(),
            'updated_at' => Carbon::now()->subWeek(),
        ]);

        $this->withHeader('X-Chatbot-Token', 'chatbot-secret')
            ->getJson("/api/chatbot/demands/open?city_id={$city->id}&months=3")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Buraco na rua principal')
            ->assertJsonPath('data.0.status', 'open');
    }

    public function test_chatbot_routes_fail_when_internal_token_is_not_configured(): void
    {
        config(['services.chatbot.internal_token' => null]);

        $this->getJson('/api/chatbot/demand-options')
            ->assertStatus(500)
            ->assertJsonPath('message', 'Token interno do chatbot nao configurado.');
    }
}
