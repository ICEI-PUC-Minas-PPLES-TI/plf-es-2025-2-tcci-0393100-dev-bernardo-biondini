<?php

namespace App\Services\Cms;

use App\Models\CmsSection;
use Illuminate\Database\Eloquent\Collection;

class CmsSectionService
{
    public function all(): Collection
    {
        $this->ensureDefaultSections();

        $query = CmsSection::query();
        $wrappedKeyColumn = $query->getQuery()->getGrammar()->wrap('key');
        $caseOrder = [];
        $bindings = [];
        $position = 1;

        foreach (array_keys(CmsSection::DEFINITIONS) as $key) {
            $caseOrder[] = sprintf('when ? then %d', $position);
            $bindings[] = $key;
            $position++;
        }

        return $query
            ->orderByRaw(sprintf(
                'case %s %s else 999 end',
                $wrappedKeyColumn,
                implode(' ', $caseOrder),
            ), $bindings)
            ->get();
    }

    public function findByKey(string $key): CmsSection
    {
        $this->ensureDefaultSections();

        return CmsSection::query()
            ->where('key', $key)
            ->firstOrFail();
    }

    public function update(string $key, array $data): CmsSection
    {
        $section = $this->findByKey($key);

        $section->update([
            'content' => $data['content'],
        ]);

        return $section->fresh();
    }

    public function ensureDefaultSections(): void
    {
        foreach (CmsSection::DEFINITIONS as $key => $title) {
            CmsSection::query()->firstOrCreate(
                ['key' => $key],
                [
                    'title' => $title,
                    'content' => $this->defaultContentFor($key),
                ],
            );
        }
    }

    private function defaultContentFor(string $key): string
    {
        return match ($key) {
            CmsSection::KEY_DEPUTY_NAME => 'Chiara Biondini',
            CmsSection::KEY_DEPUTY_ROLE => 'Deputada estadual por Minas Gerais',
            CmsSection::KEY_HERO_TITLE => 'Fiscalização firme, presença nos municípios e compromisso com resultados.',
            CmsSection::KEY_HERO_SUMMARY => 'Uma atuação política construída com escuta ativa, articulação institucional e acompanhamento constante das demandas que chegam ao gabinete.',
            CmsSection::KEY_HERO_IMAGE_URL => '',
            CmsSection::KEY_HERO_IMAGE_ALT => 'Retrato oficial da deputada',
            CmsSection::KEY_BIOGRAPHY => 'Formada em Administração, Chiara Biondini construiu sua atuação pública com foco em proximidade com os municípios, fiscalização do poder público e comunicação direta com a população.',
            CmsSection::KEY_PRIORITIES => "Educação\nTransparência\nDesenvolvimento regional\nAtendimento às demandas locais\nAcompanhamento de projetos",
            CmsSection::KEY_QUOTE => 'Politica boa é politica que se traduz em presença, clareza e resultado.',
            CmsSection::KEY_MISSION => 'Atuar com transparencia, presenca territorial e compromisso com as prioridades da populacao mineira.',
            CmsSection::KEY_TRAJECTORY => 'Construcao de uma atuacao parlamentar proxima dos municipios, com foco em escuta ativa, articulacao institucional e acompanhamento continuo das demandas.',
            default => '',
        };
    }
}
