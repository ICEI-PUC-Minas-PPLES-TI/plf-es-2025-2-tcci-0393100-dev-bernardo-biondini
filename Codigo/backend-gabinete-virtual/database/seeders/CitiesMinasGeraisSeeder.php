<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitiesMinasGeraisSeeder extends Seeder
{
    public function run(): void
    {
        $cities = [
            ['name' => 'Belo Horizonte', 'region' => 'Metropolitana de Belo Horizonte'],
            ['name' => 'Contagem', 'region' => 'Metropolitana de Belo Horizonte'],
            ['name' => 'Betim', 'region' => 'Metropolitana de Belo Horizonte'],
            ['name' => 'Ribeirao das Neves', 'region' => 'Metropolitana de Belo Horizonte'],
            ['name' => 'Uberlandia', 'region' => 'Triangulo Mineiro'],
            ['name' => 'Uberaba', 'region' => 'Triangulo Mineiro'],
            ['name' => 'Araxa', 'region' => 'Triangulo Mineiro'],
            ['name' => 'Juiz de Fora', 'region' => 'Zona da Mata'],
            ['name' => 'Muriae', 'region' => 'Zona da Mata'],
            ['name' => 'Vicosa', 'region' => 'Zona da Mata'],
            ['name' => 'Montes Claros', 'region' => 'Norte de Minas'],
            ['name' => 'Januaria', 'region' => 'Norte de Minas'],
            ['name' => 'Governador Valadares', 'region' => 'Vale do Rio Doce'],
            ['name' => 'Ipatinga', 'region' => 'Vale do Aco'],
            ['name' => 'Timoteo', 'region' => 'Vale do Aco'],
            ['name' => 'Coronel Fabriciano', 'region' => 'Vale do Aco'],
            ['name' => 'Divinopolis', 'region' => 'Centro-Oeste de Minas'],
            ['name' => 'Itauna', 'region' => 'Centro-Oeste de Minas'],
            ['name' => 'Sete Lagoas', 'region' => 'Central Mineira'],
            ['name' => 'Curvelo', 'region' => 'Central Mineira'],
            ['name' => 'Pouso Alegre', 'region' => 'Sul de Minas'],
            ['name' => 'Varginha', 'region' => 'Sul de Minas'],
            ['name' => 'Poços de Caldas', 'region' => 'Sul de Minas'],
            ['name' => 'Lavras', 'region' => 'Sul de Minas'],
            ['name' => 'Patos de Minas', 'region' => 'Alto Paranaiba'],
            ['name' => 'Teofilo Otoni', 'region' => 'Vale do Mucuri'],
            ['name' => 'Diamantina', 'region' => 'Jequitinhonha'],
            ['name' => 'Almenara', 'region' => 'Vale do Jequitinhonha'],
        ];

        foreach ($cities as $city) {
            City::query()->firstOrCreate(
                ['name' => $city['name']],
                ['region' => $city['region']],
            );
        }
    }
}
