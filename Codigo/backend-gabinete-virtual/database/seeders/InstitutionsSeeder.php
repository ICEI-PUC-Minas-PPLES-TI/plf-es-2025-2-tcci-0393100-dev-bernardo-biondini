<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionsSeeder extends Seeder
{
    public function run(): void
    {
        $institutionsByCity = [
            'Belo Horizonte' => [
                ['name' => 'Prefeitura de Belo Horizonte', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Belo Horizonte', 'type' => 'Camara Municipal'],
                ['name' => 'Secretaria Municipal de Saude de Belo Horizonte', 'type' => 'Secretaria Municipal'],
            ],
            'Contagem' => [
                ['name' => 'Prefeitura de Contagem', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Contagem', 'type' => 'Camara Municipal'],
            ],
            'Betim' => [
                ['name' => 'Prefeitura de Betim', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Betim', 'type' => 'Camara Municipal'],
            ],
            'Uberlandia' => [
                ['name' => 'Prefeitura de Uberlandia', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Uberlandia', 'type' => 'Camara Municipal'],
                ['name' => 'Hospital Municipal de Uberlandia', 'type' => 'Hospital Publico'],
            ],
            'Uberaba' => [
                ['name' => 'Prefeitura de Uberaba', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Uberaba', 'type' => 'Camara Municipal'],
            ],
            'Juiz de Fora' => [
                ['name' => 'Prefeitura de Juiz de Fora', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Juiz de Fora', 'type' => 'Camara Municipal'],
            ],
            'Montes Claros' => [
                ['name' => 'Prefeitura de Montes Claros', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Montes Claros', 'type' => 'Camara Municipal'],
            ],
            'Governador Valadares' => [
                ['name' => 'Prefeitura de Governador Valadares', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Governador Valadares', 'type' => 'Camara Municipal'],
            ],
            'Ipatinga' => [
                ['name' => 'Prefeitura de Ipatinga', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Ipatinga', 'type' => 'Camara Municipal'],
            ],
            'Divinopolis' => [
                ['name' => 'Prefeitura de Divinopolis', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Divinopolis', 'type' => 'Camara Municipal'],
            ],
            'Sete Lagoas' => [
                ['name' => 'Prefeitura de Sete Lagoas', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Sete Lagoas', 'type' => 'Camara Municipal'],
            ],
            'Pouso Alegre' => [
                ['name' => 'Prefeitura de Pouso Alegre', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Pouso Alegre', 'type' => 'Camara Municipal'],
            ],
            'Varginha' => [
                ['name' => 'Prefeitura de Varginha', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Varginha', 'type' => 'Camara Municipal'],
            ],
            'Patos de Minas' => [
                ['name' => 'Prefeitura de Patos de Minas', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Patos de Minas', 'type' => 'Camara Municipal'],
            ],
            'Teofilo Otoni' => [
                ['name' => 'Prefeitura de Teofilo Otoni', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Teofilo Otoni', 'type' => 'Camara Municipal'],
            ],
            'Diamantina' => [
                ['name' => 'Prefeitura de Diamantina', 'type' => 'Prefeitura'],
                ['name' => 'Camara Municipal de Diamantina', 'type' => 'Camara Municipal'],
            ],
        ];

        foreach ($institutionsByCity as $cityName => $institutions) {
            $city = City::query()->where('name', $cityName)->first();

            if (! $city) {
                continue;
            }

            foreach ($institutions as $institutionData) {
                Institution::query()->firstOrCreate(
                    [
                        'name' => $institutionData['name'],
                        'city_id' => $city->id,
                    ],
                    ['type' => $institutionData['type']],
                );
            }
        }
    }
}
