<?php

namespace Tests\Feature;

use App\Models\AccessProfile;
use App\Models\City;
use App\Models\CmsSection;
use App\Models\News;
use App\Models\SiteProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_endpoints_return_content_and_lists(): void
    {
        $profile = AccessProfile::query()->create([
            'name' => 'Editor',
            'description' => 'Perfil para autoria de conteudo.',
        ]);

        $author = User::factory()->create([
            'access_profile_id' => $profile->id,
        ]);

        $city = City::query()->create([
            'name' => 'Contagem',
            'region' => 'Metropolitana',
        ]);

        CmsSection::query()->create([
            'key' => 'mission',
            'title' => 'Missao',
            'content' => 'Atendimento proximo da populacao.',
        ]);

        $news = News::query()->create([
            'title' => 'Agenda da semana',
            'content' => 'Visitas e reunioes nos municipios.',
            'published_at' => now(),
            'author_id' => $author->id,
        ]);

        $siteProject = SiteProject::query()->create([
            'title' => 'Projeto de saude local',
            'description' => 'Acompanhamento de unidades basicas.',
            'status' => 'in_progress',
            'city_id' => $city->id,
            'author_id' => $author->id,
        ]);

        $this->getJson('/api/access-profiles')
            ->assertOk()
            ->assertJsonPath('data.data.0.name', 'Editor');

        $this->getJson('/api/site-content')
            ->assertOk()
            ->assertJsonFragment(['key' => 'mission'])
            ->assertJsonPath('data.news.0.id', $news->id)
            ->assertJsonPath('data.site_projects.0.id', $siteProject->id);

        $this->getJson('/api/content/mission')
            ->assertOk()
            ->assertJsonPath('data.content', 'Atendimento proximo da populacao.');

        $this->getJson('/api/news?search=Agenda')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $news->id);

        $this->getJson('/api/site-projects?status=in_progress')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $siteProject->id);
    }
}
