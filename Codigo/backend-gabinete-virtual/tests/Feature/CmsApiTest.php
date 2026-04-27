<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\City;
use App\Models\Permission;
use App\Models\User;
use App\Support\PermissionCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class CmsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_cms_sections_news_and_site_projects(): void
    {
        Storage::fake('public');

        $token = $this->issueTokenForPermission(PermissionCodes::CMS_MANAGE);
        $city = City::query()->create([
            'name' => 'Montes Claros',
            'region' => 'Norte de Minas',
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/cms/sections/mission', [
                'content' => 'Missao institucional atualizada para o portal.',
            ])
            ->assertOk()
            ->assertJsonPath('data.key', 'mission')
            ->assertJsonPath('data.content', 'Missao institucional atualizada para o portal.');

        $createNewsResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ])->post('/api/cms/news', [
            'title' => 'Nova agenda parlamentar',
            'content' => 'Publicacao com destaques da semana.',
            'published_at' => '2026-04-26 10:00:00',
            'image' => UploadedFile::fake()->image('news.jpg'),
        ]);

        $newsId = $createNewsResponse->json('data.id');

        $createNewsResponse->assertCreated()
            ->assertJsonPath('data.title', 'Nova agenda parlamentar')
            ->assertJsonPath('data.author.name', 'Test User');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/cms/news?search=agenda')
            ->assertOk()
            ->assertJsonPath('data.data.0.title', 'Nova agenda parlamentar');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/cms/news/{$newsId}", [
                'title' => 'Nova agenda parlamentar',
                'content' => 'Publicacao revisada com novos destaques.',
                'published_at' => '2026-04-26 12:00:00',
                'remove_image' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.content', 'Publicacao revisada com novos destaques.')
            ->assertJsonPath('data.image_url', null);

        $createSiteProjectResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ])->post('/api/cms/site-projects', [
            'title' => 'Projeto de apoio ao municipio',
            'description' => 'Acao institucional com entregas previstas para o semestre.',
            'city_id' => $city->id,
            'status' => 'in_progress',
            'cover_image' => UploadedFile::fake()->image('project.jpg'),
        ]);

        $siteProjectId = $createSiteProjectResponse->json('data.id');

        $createSiteProjectResponse->assertCreated()
            ->assertJsonPath('data.title', 'Projeto de apoio ao municipio')
            ->assertJsonPath('data.city.id', $city->id)
            ->assertJsonPath('data.status', 'in_progress');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/cms/site-projects?search=apoio')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $siteProjectId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/cms/site-projects/{$siteProjectId}", [
                'title' => 'Projeto de apoio ao municipio',
                'description' => 'Acao concluida com entregas registradas.',
                'city_id' => $city->id,
                'status' => 'completed',
                'remove_image' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.cover_image_url', null);

        $this->getJson('/api/site-content')
            ->assertOk()
            ->assertJsonPath('data.sections.0.key', 'mission')
            ->assertJsonPath('data.news.0.id', $newsId)
            ->assertJsonPath('data.site_projects.0.id', $siteProjectId);
    }

    private function issueTokenForPermission(string $permissionCode): string
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Gestor de CMS',
            'description' => 'Perfil de teste para o CMS.',
        ]);

        $permission = Permission::query()->create([
            'code' => $permissionCode,
            'description' => $permissionCode,
        ]);

        $profile->permissions()->attach($permission->id);

        $user = User::factory()->create([
            'name' => 'Test User',
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
