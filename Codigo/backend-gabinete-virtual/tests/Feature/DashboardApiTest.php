<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\Amendment;
use App\Models\City;
use App\Models\Demand;
use App\Models\DemandHistory;
use App\Models\Event;
use App\Models\Institution;
use App\Models\ProjectLaw;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_dashboard_overview_and_filter_by_region_and_city(): void
    {
        Carbon::setTestNow('2026-05-07 10:00:00');

        $session = $this->issueAuthenticatedSession();
        $user = $session['user'];
        $token = $session['token'];

        $metropolitanCity = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);
        $regionalCity = City::query()->create([
            'name' => 'Montes Claros',
            'region' => 'Norte de Minas',
        ]);

        $metropolitanInstitution = Institution::query()->create([
            'name' => 'Hospital Central',
            'type' => 'Saúde',
            'city_id' => $metropolitanCity->id,
        ]);
        $regionalInstitution = Institution::query()->create([
            'name' => 'Escola Estadual do Norte',
            'type' => 'Educação',
            'city_id' => $regionalCity->id,
        ]);

        $responsibleUser = User::factory()->create([
            'access_profile_id' => $user->access_profile_id,
        ]);

        $openDemand = Demand::query()->create([
            'title' => 'Reforma da praça central',
            'description' => 'Solicitação de revitalização.',
            'service_area' => 'infrastructure',
            'status' => 'open',
            'priority' => 'high',
            'responsible_user_id' => $responsibleUser->id,
            'city_id' => $metropolitanCity->id,
            'institution_id' => $metropolitanInstitution->id,
            'created_by_user_id' => $user->id,
        ]);

        $completedDemand = Demand::query()->create([
            'title' => 'Ampliação da unidade escolar',
            'description' => 'Atendimento finalizado.',
            'service_area' => 'education',
            'status' => 'completed',
            'priority' => 'medium',
            'responsible_user_id' => $responsibleUser->id,
            'city_id' => $regionalCity->id,
            'institution_id' => $regionalInstitution->id,
            'created_by_user_id' => $user->id,
        ]);

        DemandHistory::query()->create([
            'demand_id' => $openDemand->id,
            'user_id' => $user->id,
            'action' => 'created',
            'description' => 'Demanda criada.',
            'metadata' => [
                'status' => 'open',
                'service_area' => 'infrastructure',
            ],
            'created_at' => Carbon::parse('2026-05-07 09:45:00'),
            'updated_at' => Carbon::parse('2026-05-07 09:45:00'),
        ]);

        DemandHistory::query()->create([
            'demand_id' => $completedDemand->id,
            'user_id' => $user->id,
            'action' => 'updated',
            'description' => 'Demanda atualizada.',
            'metadata' => ['status' => ['from' => 'in_progress', 'to' => 'completed']],
            'created_at' => Carbon::parse('2026-05-07 09:30:00'),
            'updated_at' => Carbon::parse('2026-05-07 09:30:00'),
        ]);

        ProjectLaw::query()->create([
            'number' => 'PL 234/2026',
            'description' => 'Programa de apoio regional.',
            'status' => 'approved',
            'protocol_date' => '2026-05-03',
            'created_at' => Carbon::parse('2026-05-07 09:15:00'),
            'updated_at' => Carbon::parse('2026-05-07 09:20:00'),
        ]);

        Amendment::query()->create([
            'number' => 'E-45',
            'amount' => 350000.00,
            'status' => 'in_execution',
            'city_id' => $metropolitanCity->id,
            'application_area' => 'Infraestrutura urbana',
            'created_at' => Carbon::parse('2026-05-07 09:05:00'),
            'updated_at' => Carbon::parse('2026-05-07 09:05:00'),
        ]);

        Amendment::query()->create([
            'number' => 'E-46',
            'amount' => 480000.00,
            'status' => 'planned',
            'city_id' => $regionalCity->id,
            'application_area' => 'Educação básica',
            'created_at' => Carbon::parse('2026-05-07 08:50:00'),
            'updated_at' => Carbon::parse('2026-05-07 08:50:00'),
        ]);

        Event::query()->create([
            'title' => 'Reunião com lideranças religiosas',
            'type' => 'meeting',
            'event_at' => '2026-05-15 14:00:00',
            'starts_at' => '2026-05-15 14:00:00',
            'ends_at' => '2026-05-15 15:30:00',
            'location' => 'Gabinete regional',
            'context' => 'Planejamento de visitas',
            'description' => 'Planejamento de visitas',
            'participants_expected' => 10,
            'color' => '#315F4A',
            'city_id' => $metropolitanCity->id,
            'created_at' => Carbon::parse('2026-05-07 08:55:00'),
            'updated_at' => Carbon::parse('2026-05-07 08:55:00'),
        ]);

        Event::query()->create([
            'title' => 'Audiência no interior',
            'type' => 'audience',
            'event_at' => '2026-05-18 10:00:00',
            'starts_at' => '2026-05-18 10:00:00',
            'ends_at' => '2026-05-18 11:00:00',
            'location' => 'Montes Claros',
            'context' => 'Agenda local',
            'description' => 'Agenda local',
            'participants_expected' => 20,
            'color' => '#1F7A8C',
            'city_id' => $regionalCity->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.active_demands', 1)
            ->assertJsonPath('data.summary.completed_demands', 1)
            ->assertJsonPath('data.summary.project_laws_total', 1)
            ->assertJsonPath('data.summary.amendments', 2)
            ->assertJsonPath('data.summary.events_this_month', 2)
            ->assertJsonPath('data.options.regions.0', 'Metropolitana');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/dashboard?region=Metropolitana')
            ->assertOk()
            ->assertJsonPath('data.filters.region', 'Metropolitana')
            ->assertJsonPath('data.summary.active_demands', 1)
            ->assertJsonPath('data.summary.completed_demands', 0)
            ->assertJsonPath('data.summary.amendments', 1)
            ->assertJsonPath('data.scope.label', 'Metropolitana')
            ->assertJsonPath('data.charts.demands_by_service_area.0.key', 'infrastructure');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/dashboard?city_id={$regionalCity->id}")
            ->assertOk()
            ->assertJsonPath('data.filters.city_id', $regionalCity->id)
            ->assertJsonPath('data.scope.label', 'Montes Claros')
            ->assertJsonPath('data.summary.active_demands', 0)
            ->assertJsonPath('data.summary.completed_demands', 1)
            ->assertJsonPath('data.summary.amendments', 1)
            ->assertJsonPath('data.charts.demands_by_city.0.label', 'Montes Claros');

        Carbon::setTestNow();
    }

    /**
     * @return array{user: User, token: string}
     */
    private function issueAuthenticatedSession(): array
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Painel',
            'description' => 'Perfil base para visualizar o dashboard.',
        ]);

        $user = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => 'test',
            'token' => hash('sha256', $plainTextToken),
        ]);

        return [
            'user' => $user,
            'token' => $plainTextToken,
        ];
    }
}
