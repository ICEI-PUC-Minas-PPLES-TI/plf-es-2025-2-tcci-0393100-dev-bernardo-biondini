<?php

namespace Database\Seeders;

use App\Models\AccessProfile;
use App\Models\Amendment;
use App\Models\Attachment;
use App\Models\ChatbotSession;
use App\Models\Citizen;
use App\Models\CitizenPhone;
use App\Models\City;
use App\Models\CmsSection;
use App\Models\ContentPreference;
use App\Models\Demand;
use App\Models\DemandHistory;
use App\Models\Event;
use App\Models\EventAlert;
use App\Models\Institution;
use App\Models\Leader;
use App\Models\News;
use App\Models\Notification;
use App\Models\Permission;
use App\Models\ProjectLaw;
use App\Models\SiteProject;
use App\Models\User;
use App\Support\AmendmentApplicationAreas;
use App\Support\PermissionCodes;
use Carbon\Carbon;
use Faker\Factory as FakerFactory;
use Faker\Generator;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PresentationDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    private const DEMO_PASSWORD = 'demo123456';

    public function run(): void
    {
        $faker = FakerFactory::create('pt_BR');
        $faker->seed(20260608);

        $this->resetDynamicData();
        $this->call(DatabaseSeeder::class);

        $profiles = $this->seedAccessProfiles();
        $users = $this->seedUsers($profiles);
        $cities = City::query()->orderBy('name')->get();
        $institutionsByCity = $this->seedInstitutionsAndLeaders($faker, $cities);
        $citizens = $this->seedCitizens($faker);

        $this->seedCmsContent();
        $this->seedNews($users);
        $this->seedSiteProjects($users, $cities);

        $demands = $this->seedDemands($users, $citizens, $cities, $institutionsByCity);
        $this->seedDemandArtifacts($demands, $users);

        $events = $this->seedEvents($cities, $demands);
        $this->seedEventAlerts($events);

        $this->seedAmendments($cities);
        $this->seedProjectLaws();
    }

    private function resetDynamicData(): void
    {
        foreach ([
            'event_alerts',
            'demand_alerts',
            'demand_event',
            'notifications',
            'attachments',
            'demand_histories',
            'events',
            'demands',
            'chatbot_sessions',
            'content_preferences',
            'citizens',
            'leaders',
            'site_projects',
            'news',
            'project_laws',
            'amendments',
            'api_tokens',
            'sessions',
            'password_reset_tokens',
            'users',
            'access_profile_permission',
            'access_profiles',
            'cms_sections',
        ] as $table) {
            DB::table($table)->delete();
        }
    }

    /**
     * @return array<string, AccessProfile>
     */
    private function seedAccessProfiles(): array
    {
        $permissionIdsByCode = Permission::query()
            ->pluck('id', 'code')
            ->all();

        $definitions = [
            'deputy' => [
                'name' => 'Deputada',
                'description' => 'Perfil com foco em indicadores, agenda e acompanhamento estrategico.',
                'permissions' => [
                    PermissionCodes::USERS_VIEW,
                    PermissionCodes::DEMANDS_MANAGE,
                    PermissionCodes::AMENDMENTS_MANAGE,
                    PermissionCodes::PROJECT_LAWS_MANAGE,
                    PermissionCodes::AGENDA_MANAGE,
                    PermissionCodes::CMS_MANAGE,
                ],
            ],
            'chief' => [
                'name' => 'Chefe de Gabinete',
                'description' => 'Perfil de coordenacao geral do gabinete e priorizacao de entregas.',
                'permissions' => [
                    PermissionCodes::USERS_VIEW,
                    PermissionCodes::DEMANDS_MANAGE,
                    PermissionCodes::AMENDMENTS_MANAGE,
                    PermissionCodes::PROJECT_LAWS_MANAGE,
                    PermissionCodes::AGENDA_MANAGE,
                    PermissionCodes::CMS_MANAGE,
                    PermissionCodes::ROLES_VIEW,
                ],
            ],
            'demand_manager' => [
                'name' => 'Gestao de Demandas',
                'description' => 'Perfil operacional para triagem, atribuicao e acompanhamento de demandas.',
                'permissions' => [
                    PermissionCodes::USERS_VIEW,
                    PermissionCodes::DEMANDS_MANAGE,
                    PermissionCodes::AGENDA_MANAGE,
                ],
            ],
            'attendant' => [
                'name' => 'Atendimento',
                'description' => 'Perfil focado em cadastro de demandas e suporte ao atendimento.',
                'permissions' => [
                    PermissionCodes::DEMANDS_MANAGE,
                    PermissionCodes::AGENDA_MANAGE,
                ],
            ],
            'communication' => [
                'name' => 'Comunicacao',
                'description' => 'Perfil responsavel por noticias, projetos do site e atualizacoes publicas.',
                'permissions' => [
                    PermissionCodes::CMS_MANAGE,
                    PermissionCodes::PROJECT_LAWS_MANAGE,
                    PermissionCodes::AMENDMENTS_MANAGE,
                ],
            ],
            'legislative' => [
                'name' => 'Analista Legislativo',
                'description' => 'Perfil de apoio aos modulos legislativos e consolidacao de informacoes.',
                'permissions' => [
                    PermissionCodes::AMENDMENTS_MANAGE,
                    PermissionCodes::PROJECT_LAWS_MANAGE,
                    PermissionCodes::DEMANDS_MANAGE,
                ],
            ],
        ];

        $profiles = [
            'admin' => AccessProfile::query()->firstOrCreate(
                ['name' => 'Administrador'],
                ['description' => 'Perfil com acesso total ao sistema.'],
            ),
        ];

        foreach ($definitions as $key => $definition) {
            $profile = AccessProfile::query()->firstOrCreate(
                ['name' => $definition['name']],
                ['description' => $definition['description']],
            );

            $profile->permissions()->sync(
                collect($definition['permissions'])
                    ->map(fn (string $code) => $permissionIdsByCode[$code] ?? null)
                    ->filter()
                    ->values()
                    ->all(),
            );

            $profiles[$key] = $profile;
        }

        $profiles['admin']->permissions()->syncWithoutDetaching(
            Permission::query()->pluck('id')->all(),
        );

        return $profiles;
    }

    /**
     * @param  array<string, AccessProfile>  $profiles
     * @return array<string, User>
     */
    private function seedUsers(array $profiles): array
    {
        $password = Hash::make(self::DEMO_PASSWORD);

        $definitions = [
            'admin' => ['name' => 'Administrador Demo', 'email' => 'admin.demo@gabinetevirtual.test', 'profile' => 'admin'],
            'deputy' => ['name' => 'Chiara Biondini', 'email' => 'chiara.demo@gabinetevirtual.test', 'profile' => 'deputy'],
            'chief' => ['name' => 'Priscila Souza', 'email' => 'chefe.demo@gabinetevirtual.test', 'profile' => 'chief'],
            'demand_manager' => ['name' => 'Amanda Ferreira', 'email' => 'demandas.demo@gabinetevirtual.test', 'profile' => 'demand_manager'],
            'attendant_1' => ['name' => 'Lucas Almeida', 'email' => 'atendimento1.demo@gabinetevirtual.test', 'profile' => 'attendant'],
            'attendant_2' => ['name' => 'Marina Costa', 'email' => 'atendimento2.demo@gabinetevirtual.test', 'profile' => 'attendant'],
            'communication' => ['name' => 'Rafael Gomes', 'email' => 'comunicacao.demo@gabinetevirtual.test', 'profile' => 'communication'],
            'legislative' => ['name' => 'Bruno Carvalho', 'email' => 'legislativo.demo@gabinetevirtual.test', 'profile' => 'legislative'],
        ];

        $users = [];

        foreach ($definitions as $key => $definition) {
            $users[$key] = User::query()->create([
                'name' => $definition['name'],
                'email' => $definition['email'],
                'password' => $password,
                'access_profile_id' => $profiles[$definition['profile']]->id,
            ]);
        }

        User::query()->firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
            'access_profile_id' => $profiles['admin']->id,
        ]);

        return $users;
    }

    /**
     * @param  Collection<int, City>  $cities
     * @return Collection<int, Collection<int, Institution>>
     */
    private function seedInstitutionsAndLeaders(Generator $faker, Collection $cities): Collection
    {
        $supplementalInstitutionTypes = [
            ['pattern' => 'Secretaria Municipal de Educacao de %s', 'type' => 'Secretaria Municipal'],
            ['pattern' => 'Secretaria Municipal de Obras de %s', 'type' => 'Secretaria Municipal'],
            ['pattern' => 'Santa Casa de %s', 'type' => 'Hospital Filantropico'],
        ];

        foreach ($cities as $city) {
            foreach ($supplementalInstitutionTypes as $definition) {
                Institution::query()->firstOrCreate(
                    [
                        'name' => sprintf($definition['pattern'], $city->name),
                        'city_id' => $city->id,
                    ],
                    ['type' => $definition['type']],
                );
            }
        }

        $institutions = Institution::query()
            ->with('city')
            ->orderBy('name')
            ->get()
            ->groupBy('city_id');

        foreach ($institutions as $cityInstitutions) {
            foreach ($cityInstitutions as $institution) {
                $position = match ($institution->type) {
                    'Prefeitura' => 'Prefeito Municipal',
                    'Camara Municipal' => 'Presidente da Camara',
                    'Secretaria Municipal' => 'Secretario Municipal',
                    'Hospital Publico', 'Hospital Filantropico' => 'Diretor Geral',
                    default => 'Representante Institucional',
                };

                Leader::query()->create([
                    'name' => $faker->name(),
                    'position' => $position,
                    'institution_id' => $institution->id,
                ]);
            }
        }

        return $institutions;
    }

    /**
     * @return Collection<int, Citizen>
     */
    private function seedCitizens(Generator $faker): Collection
    {
        $citizens = collect();

        for ($index = 1; $index <= 32; $index++) {
            $phone = '+55319'.str_pad((string) (90000000 + $index), 8, '0', STR_PAD_LEFT);
            $receiveDemandUpdates = $index % 4 !== 0;
            $citizen = Citizen::query()->create([
                'name' => $faker->name(),
                'cpf' => str_pad((string) (10000000000 + $index), 11, '0', STR_PAD_LEFT),
                'birth_date' => Carbon::instance($faker->dateTimeBetween('-70 years', '-18 years'))->toDateString(),
                'phone' => $phone,
                'receive_demand_updates' => $receiveDemandUpdates,
            ]);

            CitizenPhone::query()->create([
                'citizen_id' => $citizen->id,
                'phone' => $phone,
                'normalized_phone' => substr((string) preg_replace('/\D+/', '', $phone), 2),
            ]);

            ContentPreference::query()->create([
                'citizen_id' => $citizen->id,
                'receive_content' => $receiveDemandUpdates,
            ]);

            if ($index % 2 === 0) {
                ChatbotSession::query()->create([
                    'citizen_id' => $citizen->id,
                    'channel' => 'whatsapp',
                    'started_at' => now()->subDays($index)->subMinutes(20),
                    'ended_at' => $index % 5 === 0 ? null : now()->subDays($index)->subMinutes(5),
                ]);
            }

            $citizens->push($citizen);
        }

        return $citizens;
    }

    private function seedCmsContent(): void
    {
        $contentByKey = [
            CmsSection::KEY_DEPUTY_NAME => 'Chiara Biondini',
            CmsSection::KEY_DEPUTY_ROLE => 'Deputada estadual por Minas Gerais',
            CmsSection::KEY_HERO_TITLE => 'Presenca nos municipios, acompanhamento de demandas e foco em resultado.',
            CmsSection::KEY_HERO_SUMMARY => 'Atuacao parlamentar com monitoramento de entregas, articulacao institucional e resposta mais rapida para as necessidades locais.',
            CmsSection::KEY_HERO_IMAGE_ALT => 'Retrato oficial da deputada Chiara Biondini',
            CmsSection::KEY_BIOGRAPHY => 'Mandato com atuacao voltada para acompanhamento de municipios, fiscalizacao e apoio direto a liderancas e instituicoes parceiras.',
            CmsSection::KEY_PRIORITIES => "Saude\nEducacao\nInfraestrutura\nAssistencia social\nTransparencia",
            CmsSection::KEY_QUOTE => 'Informacao organizada gera resposta mais rapida e decisao mais segura.',
            CmsSection::KEY_MISSION => 'Transformar informacao dispersa em acompanhamento estruturado, proximidade com os municipios e resultado concreto.',
            CmsSection::KEY_TRAJECTORY => 'Construcao de uma operacao parlamentar mais integrada, com agenda coordenada, demandas monitoradas e comunicacao institucional consistente.',
        ];

        foreach ($contentByKey as $key => $content) {
            CmsSection::query()->where('key', $key)->update([
                'content' => $content,
            ]);
        }
    }

    /**
     * @param  array<string, User>  $users
     */
    private function seedNews(array $users): void
    {
        $items = [
            'Gabinete reforca agenda regional no Norte de Minas',
            'Mandato acompanha demandas de saude em hospitais filantropicos',
            'Equipe consolida painel de emendas para prestacao de contas',
            'Nova rodada de visitas institucionais prioriza educacao e infraestrutura',
            'Atendimento registra crescimento no volume de solicitacoes municipais',
            'Projetos do site passam a destacar entregas por municipio',
            'Agenda do gabinete amplia reunioes com liderancas locais',
            'Relatorio consolidado apoia definicao das prioridades do trimestre',
            'Canal de atendimento recebe novas demandas pelo fluxo de chatbot',
            'Equipe revisa andamento de projetos e compromissos da semana',
        ];

        foreach ($items as $index => $title) {
            News::query()->create([
                'title' => $title,
                'content' => 'Conteudo demonstrativo para apresentacao do sistema, com foco em centralizacao das informacoes, acompanhamento de resultados e comunicacao institucional.',
                'published_at' => now()->subDays($index * 3)->setHour(9),
                'author_id' => $index % 3 === 0 ? $users['communication']->id : $users['chief']->id,
            ]);
        }
    }

    /**
     * @param  array<string, User>  $users
     * @param  Collection<int, City>  $cities
     */
    private function seedSiteProjects(array $users, Collection $cities): void
    {
        $projects = [
            'Programa de apoio a hospitais filantropicos',
            'Agenda regional de liderancas comunitarias',
            'Plano de visitas tecnicas a obras prioritarias',
            'Painel de acompanhamento de emendas por municipio',
            'Roteiro de reunioes com secretarias municipais',
            'Mutirao de demandas represadas do gabinete',
            'Plano de comunicacao institucional por territorio',
            'Circuito de dialogo com entidades sociais',
        ];

        foreach ($projects as $index => $title) {
            $city = $cities[$index % $cities->count()];

            SiteProject::query()->create([
                'title' => $title,
                'description' => 'Projeto demonstrativo vinculado ao municipio de '.$city->name.', utilizado para compor o conteudo institucional do site e ilustrar a integracao com o backend.',
                'status' => SiteProject::STATUSES[$index % count(SiteProject::STATUSES)],
                'city_id' => $city->id,
                'author_id' => $index % 2 === 0 ? $users['communication']->id : $users['chief']->id,
            ]);
        }
    }

    /**
     * @param  array<string, User>  $users
     * @param  Collection<int, Citizen>  $citizens
     * @param  Collection<int, City>  $cities
     * @param  Collection<int, Collection<int, Institution>>  $institutionsByCity
     * @return Collection<int, Demand>
     */
    private function seedDemands(array $users, Collection $citizens, Collection $cities, Collection $institutionsByCity): Collection
    {
        $serviceAreaTitles = [
            'health' => [
                'Mutirao de consultas especializadas',
                'Apoio para transporte de pacientes',
                'Reforco de atendimento em unidade basica',
                'Pedido de equipagem para posto de saude',
            ],
            'education' => [
                'Adequacao de transporte escolar rural',
                'Reforma de cobertura em escola estadual',
                'Ampliação de vagas em creche municipal',
                'Solicitacao de mobiliario escolar',
            ],
            'infrastructure' => [
                'Recapeamento de via com grande fluxo',
                'Reforma de ponte em acesso rural',
                'Instalacao de iluminacao publica',
                'Recuperacao de drenagem em bairro central',
            ],
            'social_assistance' => [
                'Apoio a entidade de acolhimento social',
                'Reforco de atendimento do CRAS',
                'Demanda por cestas emergenciais',
                'Articulacao para ampliacao de servicos sociais',
            ],
            'public_security' => [
                'Reforco de policiamento preventivo',
                'Pedido de base movel para evento local',
                'Solicitacao de iluminacao em area de risco',
                'Acompanhamento de ocorrencias recorrentes',
            ],
            'transport' => [
                'Revisao de linha intermunicipal',
                'Adequacao de ponto de onibus',
                'Pedido de acessibilidade em terminal',
                'Melhoria de sinalizacao viaria',
            ],
            'housing' => [
                'Regularizacao fundiaria de conjunto habitacional',
                'Apoio para familias afetadas por chuvas',
                'Melhoria em moradias de interesse social',
                'Encaminhamento de demanda habitacional coletiva',
            ],
            'agriculture' => [
                'Manutencao de estrada para escoamento rural',
                'Apoio a produtores de leite',
                'Recuperacao de ponte para acesso agricola',
                'Solicitacao de maquinario para associacao rural',
            ],
            'culture' => [
                'Apoio a festa tradicional do municipio',
                'Recuperacao de espaco cultural',
                'Agenda de incentivo a artistas locais',
                'Solicitacao de estrutura para evento cultural',
            ],
            'sport' => [
                'Reforma de quadra poliesportiva',
                'Kit esportivo para projeto social',
                'Iluminacao de campo comunitario',
                'Apoio a campeonato estudantil',
            ],
            'environment' => [
                'Limpeza de nascente urbana',
                'Combate a descarte irregular de residuos',
                'Apoio a brigada voluntaria',
                'Recuperacao de area degradada',
            ],
            'other' => [
                'Encaminhamento institucional prioritario',
                'Demanda diversa de articulacao regional',
                'Acompanhamento de solicitacao intersetorial',
                'Solicitacao de apoio operacional complementar',
            ],
        ];

        $statuses = ['open', 'under_review', 'in_progress', 'completed'];
        $priorities = ['high', 'medium', 'medium', 'low'];
        $responsiblePool = [
            $users['chief'],
            $users['demand_manager'],
            $users['attendant_1'],
            $users['attendant_2'],
            $users['legislative'],
        ];
        $creatorPool = [
            $users['attendant_1'],
            $users['attendant_2'],
            $users['demand_manager'],
        ];
        $citiesWithInstitutions = $cities
            ->filter(fn (City $city) => $institutionsByCity->has($city->id) && $institutionsByCity[$city->id]->isNotEmpty())
            ->values();

        $citizenIndex = 0;
        $cityIndex = 0;
        $demandIndex = 1;
        $demands = Demand::query()->getModel()->newCollection();

        foreach ($serviceAreaTitles as $serviceArea => $titles) {
            foreach ($titles as $title) {
                $city = $citiesWithInstitutions[$cityIndex % $citiesWithInstitutions->count()];
                $cityIndex++;

                $institutions = $institutionsByCity[$city->id];
                $institution = $institutions[$demandIndex % $institutions->count()];
                $status = $statuses[$demandIndex % count($statuses)];
                $priority = $priorities[$demandIndex % count($priorities)];
                $responsibleUser = $responsiblePool[$demandIndex % count($responsiblePool)];

                $createdByCitizen = ($demandIndex % 3 === 0 || $demandIndex % 5 === 0)
                    ? $citizens[$citizenIndex++ % $citizens->count()]
                    : null;

                $creatorUser = $createdByCitizen
                    ? null
                    : $creatorPool[$demandIndex % count($creatorPool)];

                $demands->push(Demand::query()->create([
                    'title' => $title.' - '.$city->name,
                    'description' => 'Registro demonstrativo para o municipio de '.$city->name.', associado a '.$institution->name.' e utilizado para apresentar o fluxo de acompanhamento de demandas do gabinete.',
                    'service_area' => $serviceArea,
                    'status' => $status,
                    'priority' => $priority,
                    'responsible_user_id' => $responsibleUser->id,
                    'city_id' => $city->id,
                    'institution_id' => $institution->id,
                    'created_by_user_id' => $creatorUser?->id,
                    'created_by_citizen_id' => $createdByCitizen?->id,
                ]));

                $demandIndex++;
            }
        }

        return $demands->load(['city', 'institution', 'user', 'citizen']);
    }

    /**
     * @param  Collection<int, Demand>  $demands
     * @param  array<string, User>  $users
     */
    private function seedDemandArtifacts(Collection $demands, array $users): void
    {
        foreach ($demands as $index => $demand) {
            $actor = $demand->created_by_user_id
                ? User::query()->find($demand->created_by_user_id)
                : $users['attendant_1'];

            DemandHistory::query()->create([
                'demand_id' => $demand->id,
                'user_id' => $actor?->id,
                'action' => 'created',
                'description' => 'Demanda registrada no sistema.',
                'metadata' => [
                    'service_area' => $demand->service_area,
                    'priority' => $demand->priority,
                ],
            ]);

            DemandHistory::query()->create([
                'demand_id' => $demand->id,
                'user_id' => $users['demand_manager']->id,
                'action' => 'assigned',
                'description' => 'Responsavel definido para acompanhamento.',
                'metadata' => [
                    'responsible_user_id' => $demand->responsible_user_id,
                ],
            ]);

            if (in_array($demand->status, ['under_review', 'in_progress', 'completed'], true)) {
                DemandHistory::query()->create([
                    'demand_id' => $demand->id,
                    'user_id' => $users['demand_manager']->id,
                    'action' => 'status_updated',
                    'description' => 'Demanda encaminhada para analise.',
                    'metadata' => [
                        'to_status' => 'under_review',
                    ],
                ]);
            }

            if (in_array($demand->status, ['in_progress', 'completed'], true)) {
                DemandHistory::query()->create([
                    'demand_id' => $demand->id,
                    'user_id' => $users['chief']->id,
                    'action' => 'status_updated',
                    'description' => 'Atendimento em andamento com retorno para a equipe.',
                    'metadata' => [
                        'to_status' => 'in_progress',
                    ],
                ]);
            }

            if ($demand->status === 'completed') {
                DemandHistory::query()->create([
                    'demand_id' => $demand->id,
                    'user_id' => $users['chief']->id,
                    'action' => 'completed',
                    'description' => 'Demanda concluida e validada pelo gabinete.',
                    'metadata' => [
                        'to_status' => 'completed',
                    ],
                ]);
            }

            if ($index % 2 === 0) {
                Attachment::query()->create([
                    'reference_table' => 'demands',
                    'reference_id' => $demand->id,
                    'file_path' => sprintf('attachments/oficios/oficio-demo-%03d.pdf', $demand->id),
                ]);
            }

            if ($index % 5 === 0) {
                Attachment::query()->create([
                    'reference_table' => 'demands',
                    'reference_id' => $demand->id,
                    'file_path' => sprintf('attachments/anexos/checklist-demo-%03d.pdf', $demand->id),
                ]);
            }

            if ($demand->created_by_citizen_id) {
                Notification::query()->create([
                    'citizen_id' => $demand->created_by_citizen_id,
                    'demand_id' => $demand->id,
                    'message' => 'Sua demanda foi recebida pelo gabinete e entrou em acompanhamento.',
                    'sent_at' => now()->subDays(max(1, $index % 7))->setHour(11),
                    'type' => 'status_update',
                ]);

                if ($demand->status !== 'open') {
                    Notification::query()->create([
                        'citizen_id' => $demand->created_by_citizen_id,
                        'demand_id' => $demand->id,
                        'message' => 'Houve atualizacao no andamento da sua demanda.',
                        'sent_at' => now()->subDays(max(1, $index % 5))->setHour(16),
                        'type' => 'status_update',
                    ]);
                }
            }
        }
    }

    /**
     * @param  Collection<int, City>  $cities
     * @param  Collection<int, Demand>  $demands
     * @return Collection<int, Event>
     */
    private function seedEvents(Collection $cities, Collection $demands): Collection
    {
        $titles = [
            'Reuniao com liderancas municipais',
            'Audiencia publica regional',
            'Visita tecnica a obra prioritaria',
            'Sessao institucional de acompanhamento',
            'Encontro com entidades sociais',
            'Agenda de entregas do gabinete',
            'Reuniao sobre emendas em execucao',
            'Visita a equipamento publico',
            'Painel de demandas do territorio',
            'Encontro com secretarias municipais',
            'Agenda de articulacao politica',
            'Reuniao de consolidacao de relatorios',
        ];
        $types = ['meeting', 'audience', 'visit', 'session', 'other'];
        $colors = ['#4338ca', '#0f766e', '#b45309', '#be123c', '#475569'];
        $events = collect();

        for ($index = 0; $index < 18; $index++) {
            $city = $cities[$index % $cities->count()];
            $startsAt = now()->startOfDay()->addDays($index - 6)->setHour(8 + ($index % 5) * 2);
            $endsAt = $startsAt->copy()->addHours(2 + ($index % 3));
            $title = $titles[$index % count($titles)].' - '.$city->name;

            $event = Event::query()->create([
                'title' => $title,
                'type' => $types[$index % count($types)],
                'event_at' => $startsAt,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'location' => 'Agenda institucional em '.$city->name,
                'context' => 'Evento demonstrativo usado para apresentar calendario, contexto e articulacao com demandas do municipio.',
                'description' => 'Encontro criado para exibicao do modulo de agenda durante a apresentacao.',
                'participants_expected' => 20 + ($index * 7),
                'color' => $colors[$index % count($colors)],
                'city_id' => $city->id,
            ]);

            $relatedDemandIds = $demands
                ->where('city_id', $city->id)
                ->slice(0, 2)
                ->pluck('id')
                ->all();

            $event->demands()->syncWithoutDetaching($relatedDemandIds);
            $events->push($event);
        }

        return $events;
    }

    /**
     * @param  Collection<int, Event>  $events
     */
    private function seedEventAlerts(Collection $events): void
    {
        foreach ($events as $index => $event) {
            if ($event->starts_at->isFuture()) {
                EventAlert::query()->create([
                    'event_id' => $event->id,
                    'title' => 'Lembrete de agenda',
                    'message' => 'Evento programado para as proximas 24 horas.',
                    'alert_at' => $event->starts_at->copy()->subDay(),
                    'lead_time_minutes' => 1440,
                    'channel' => $index % 2 === 0 ? 'system' : 'email',
                    'is_recurring' => false,
                ]);
            }

            if ($index % 3 === 0) {
                EventAlert::query()->create([
                    'event_id' => $event->id,
                    'title' => 'Checklist pre-evento',
                    'message' => 'Validar briefing, participantes e materiais de apoio.',
                    'alert_at' => $event->starts_at->copy()->subHours(2),
                    'lead_time_minutes' => 120,
                    'channel' => 'system',
                    'is_recurring' => false,
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, City>  $cities
     */
    private function seedAmendments(Collection $cities): void
    {
        $areas = AmendmentApplicationAreas::values();

        for ($index = 1; $index <= 24; $index++) {
            $city = $cities[($index - 1) % $cities->count()];

            Amendment::query()->create([
                'number' => sprintf('EMD-2026-%03d', $index),
                'amount' => 75000 + ($index * 18500),
                'status' => Amendment::STATUSES[$index % count(Amendment::STATUSES)],
                'city_id' => $city->id,
                'application_area' => $areas[$index % count($areas)],
            ]);
        }
    }

    private function seedProjectLaws(): void
    {
        $descriptions = [
            'Projeto para ampliar mecanismos de transparencia na execucao de emendas.',
            'Projeto para fortalecer a cooperacao entre municipios em demandas regionais.',
            'Projeto para acelerar fluxos de encaminhamento em saude especializada.',
            'Projeto para incentivar a manutencao preventiva de vias estaduais.',
            'Projeto para apoiar conectividade em escolas da rede publica.',
            'Projeto para estimular monitoramento de obras prioritarias.',
            'Projeto para consolidar indicadores territoriais em paines de acompanhamento.',
            'Projeto para aprimorar seguranca em entornos escolares.',
            'Projeto para simplificar prestacao de contas de iniciativas municipais.',
            'Projeto para ampliar integracao entre atendimento e articulacao institucional.',
            'Projeto para reforcar apoio a entidades sociais parceiras.',
            'Projeto para estruturar politicas de incentivo ao esporte comunitario.',
            'Projeto para fomentar programas de habitacao de interesse social.',
            'Projeto para incentivar boas praticas de gestao ambiental local.',
            'Projeto para fortalecer politicas de mobilidade regional.',
            'Projeto para organizar respostas integradas em periodos de chuvas intensas.',
        ];

        foreach ($descriptions as $index => $description) {
            ProjectLaw::query()->create([
                'number' => sprintf('PL-2026-%03d', $index + 1),
                'description' => $description,
                'status' => ProjectLaw::STATUSES[$index % count(ProjectLaw::STATUSES)],
                'protocol_date' => now()->subDays(120 - ($index * 5))->toDateString(),
            ]);
        }
    }
}
