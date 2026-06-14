<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\City;
use App\Models\Demand;
use App\Models\Institution;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class DemandApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    public function test_user_can_manage_demands_with_service_area(): void
    {
        Storage::fake('public');

        $token = $this->issueTokenForPermission(PermissionCodes::DEMANDS_MANAGE);
        $city = City::query()->create([
            'name' => 'Belo Horizonte',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Hospital Regional',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $responsibleUser = User::factory()->create();
        $oficio = UploadedFile::fake()->create(
            'oficio-inicial.pdf',
            120,
            'application/pdf',
        );
        $discardedDemand = Demand::query()->create([
            'title' => 'Solicitação descartada',
            'description' => 'Registro descartado pelo fluxo automatizado.',
            'service_area' => 'social_assistance',
            'status' => 'discarded',
            'discard_message' => 'Idioma identificado nao e portugues, mas Ingles.',
            'priority' => 'low',
            'responsible_user_id' => $responsibleUser->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands/options')
            ->assertOk()
            ->assertJsonPath('data.service_areas.0.value', 'health');

        $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/demands', [
                'title' => 'Mutirão de consultas',
                'description' => 'Organizar atendimento especializado.',
                'service_area' => 'health',
                'status' => 'open',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
                'oficio' => $oficio,
            ]);

        $demandId = $createResponse->json('data.id');
        $storedDemand = Demand::query()->findOrFail($demandId);
        $storedOficioPath = $storedDemand->getRawOriginal('oficio_path');

        $createResponse->assertCreated()
            ->assertJsonPath('data.service_area', 'health')
            ->assertJsonPath('data.oficio_original_name', 'oficio-inicial.pdf')
            ->assertJsonPath('data.oficio_mime_type', 'application/pdf');

        $this->assertNotNull($storedOficioPath);
        Storage::disk('public')->assertExists($storedOficioPath);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/demands/{$demandId}")
            ->assertOk()
            ->assertJsonPath('data.id', $demandId)
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.oficio_original_name', 'oficio-inicial.pdf');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->get("/api/demands/{$demandId}/oficio/download")
            ->assertOk()
            ->assertDownload('oficio-inicial.pdf');

        $novoOficio = UploadedFile::fake()->create(
            'oficio-atualizado.xlsx',
            180,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post("/api/demands/{$demandId}", [
                '_method' => 'PUT',
                'title' => 'Mutirão de consultas',
                'description' => 'Organizar atendimento especializado e triagem.',
                'service_area' => 'social_assistance',
                'status' => 'in_progress',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
                'oficio' => $novoOficio,
            ])
            ->assertOk()
            ->assertJsonPath('data.service_area', 'social_assistance')
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.oficio_original_name', 'oficio-atualizado.xlsx');

        Storage::disk('public')->assertMissing($storedOficioPath);

        $updatedDemand = Demand::query()->findOrFail($demandId);
        $updatedOficioPath = $updatedDemand->getRawOriginal('oficio_path');
        $this->assertNotNull($updatedOficioPath);
        Storage::disk('public')->assertExists($updatedOficioPath);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post("/api/demands/{$demandId}", [
                '_method' => 'PUT',
                'title' => 'Mutirão de consultas',
                'description' => 'Organizar atendimento especializado e triagem.',
                'service_area' => 'social_assistance',
                'status' => 'in_progress',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
                'remove_oficio' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.oficio_original_name', null)
            ->assertJsonPath('data.oficio_mime_type', null);

        Storage::disk('public')->assertMissing($updatedOficioPath);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $demandId)
            ->assertJsonMissing(['title' => 'Solicitação descartada']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands?service_area=social_assistance')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $demandId)
            ->assertJsonMissing(['title' => 'Solicitação descartada']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/demands?status=discarded')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $discardedDemand->id)
            ->assertJsonPath('data.data.0.status', 'discarded')
            ->assertJsonPath(
                'data.data.0.discard_message',
                'Idioma identificado nao e portugues, mas Ingles.',
            );

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/demands/{$demandId}/histories")
            ->assertOk()
            ->assertJsonPath('data.data.0.demand_id', $demandId)
            ->assertJsonFragment([
                'oficio_original_name' => [
                    'from' => 'oficio-atualizado.xlsx',
                    'to' => null,
                ],
            ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/demands/{$demandId}")
            ->assertOk()
            ->assertJsonPath('message', 'Demanda removida com sucesso.');

        $this->assertDatabaseMissing('demands', ['id' => $demandId]);
    }

    public function test_user_can_create_demand_without_institution(): void
    {
        $token = $this->issueTokenForPermission(PermissionCodes::DEMANDS_MANAGE);
        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/demands', [
                'title' => 'Demanda sem instituicao',
                'description' => 'Registro criado sem instituicao vinculada.',
                'service_area' => 'health',
                'status' => 'open',
                'priority' => 'medium',
                'city_id' => $city->id,
            ]);

        $demandId = $response->json('data.id');

        $response->assertCreated()
            ->assertJsonPath('data.id', $demandId)
            ->assertJsonPath('data.institution_id', null);

        $this->assertDatabaseHas('demands', [
            'id' => $demandId,
            'institution_id' => null,
        ]);
    }

    public function test_authenticated_user_without_manage_can_list_demands_but_cannot_filter_by_another_responsible(): void
    {
        $session = $this->issueAuthenticatedSession();
        $city = City::query()->create([
            'name' => 'Contagem',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Hospital Municipal',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $otherResponsible = User::factory()->create();

        Demand::query()->create([
            'title' => 'Demanda do proprio usuario',
            'description' => 'Demanda atribuida ao usuario autenticado.',
            'service_area' => 'health',
            'status' => 'open',
            'priority' => 'medium',
            'responsible_user_id' => $session['user']->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => $session['user']->id,
        ]);

        Demand::query()->create([
            'title' => 'Demanda de outro responsavel',
            'description' => 'Demanda atribuida a outro usuario.',
            'service_area' => 'education',
            'status' => 'under_review',
            'priority' => 'high',
            'responsible_user_id' => $otherResponsible->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => $otherResponsible->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/demands')
            ->assertOk()
            ->assertJsonCount(2, 'data.data');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/demands/options')
            ->assertOk()
            ->assertJsonCount(1, 'data.users')
            ->assertJsonPath('data.users.0.id', $session['user']->id);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/demands?responsible_user_id='.$session['user']->id)
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.responsible_user_id', $session['user']->id);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson('/api/demands?responsible_user_id='.$otherResponsible->id)
            ->assertForbidden()
            ->assertJsonPath('message', 'Voce nao tem permissao para executar esta acao.');
    }

    public function test_authenticated_user_without_manage_can_update_own_demand_and_view_history(): void
    {
        Storage::fake('public');

        $session = $this->issueAuthenticatedSession();
        $city = City::query()->create([
            'name' => 'Betim',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'UBS Central',
            'type' => 'Saúde',
            'city_id' => $city->id,
        ]);
        $responsibleUser = User::factory()->create();
        $oficioPath = UploadedFile::fake()->create(
            'oficio-proprio.pdf',
            64,
            'application/pdf',
        )->store('demands/oficios', 'public');

        $demand = Demand::query()->create([
            'title' => 'Demanda propria',
            'description' => 'Demanda criada pelo usuario autenticado.',
            'service_area' => 'health',
            'status' => 'open',
            'priority' => 'medium',
            'responsible_user_id' => $responsibleUser->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => $session['user']->id,
            'oficio_path' => $oficioPath,
            'oficio_original_name' => 'oficio-proprio.pdf',
            'oficio_mime_type' => 'application/pdf',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->putJson("/api/demands/{$demand->id}", [
                'title' => 'Demanda propria atualizada',
                'description' => 'Descricao atualizada pelo dono da demanda.',
                'service_area' => 'social_assistance',
                'status' => 'in_progress',
                'priority' => 'high',
                'responsible_user_id' => $responsibleUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Demanda propria atualizada')
            ->assertJsonPath('data.status', 'in_progress');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson("/api/demands/{$demand->id}/histories")
            ->assertOk()
            ->assertJsonPath('data.data.0.demand_id', $demand->id);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->get("/api/demands/{$demand->id}/oficio/download")
            ->assertOk()
            ->assertDownload('oficio-proprio.pdf');
    }

    public function test_authenticated_user_without_manage_cannot_create_update_or_delete_foreign_demands(): void
    {
        $session = $this->issueAuthenticatedSession();
        $city = City::query()->create([
            'name' => 'Ribeirão das Neves',
            'region' => 'Metropolitana',
        ]);
        $institution = Institution::query()->create([
            'name' => 'Escola Estadual',
            'type' => 'Educação',
            'city_id' => $city->id,
        ]);
        $otherUser = User::factory()->create();

        $demand = Demand::query()->create([
            'title' => 'Demanda de terceiro',
            'description' => 'Demanda criada por outro usuario.',
            'service_area' => 'education',
            'status' => 'open',
            'priority' => 'low',
            'responsible_user_id' => $otherUser->id,
            'city_id' => $city->id,
            'institution_id' => $institution->id,
            'created_by_user_id' => $otherUser->id,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->postJson('/api/demands', [
                'title' => 'Tentativa de criacao',
                'description' => 'Usuario sem manage nao pode criar.',
                'service_area' => 'health',
                'status' => 'open',
                'priority' => 'medium',
                'responsible_user_id' => $session['user']->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Voce nao tem permissao para executar esta acao.');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->putJson("/api/demands/{$demand->id}", [
                'title' => 'Tentativa de edicao',
                'description' => 'Usuario sem manage nao pode editar demanda alheia.',
                'service_area' => 'education',
                'status' => 'completed',
                'priority' => 'high',
                'responsible_user_id' => $otherUser->id,
                'city_id' => $city->id,
                'institution_id' => $institution->id,
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Voce nao tem permissao para executar esta acao.');

        $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->deleteJson("/api/demands/{$demand->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Voce nao tem permissao para executar esta acao.');
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de Demandas',
            'description' => 'Perfil de teste para demandas.',
        ]);

        $permission = Permission::query()->create([
            'code' => $permissionCode,
            'description' => $permissionCode,
        ]);

        $profile->permissions()->attach($permission->id);

        $user = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => 'test',
            'token' => hash('sha256', $plainTextToken),
        ]);

        return $plainTextToken;
    }
}
