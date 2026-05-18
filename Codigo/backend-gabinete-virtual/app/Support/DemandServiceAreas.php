<?php

namespace App\Support;

final class DemandServiceAreas
{
    /**
     * @var array<string, string>
     */
    private const LABELS = [
        'health' => 'Saúde',
        'education' => 'Educação',
        'infrastructure' => 'Infraestrutura',
        'social_assistance' => 'Assistência social',
        'public_security' => 'Segurança pública',
        'transport' => 'Transporte e mobilidade',
        'housing' => 'Habitação',
        'agriculture' => 'Agricultura',
        'culture' => 'Cultura',
        'sport' => 'Esporte e lazer',
        'environment' => 'Meio ambiente',
        'other' => 'Outras',
    ];

    /**
     * @return string[]
     */
    public static function values(): array
    {
        return array_keys(self::LABELS);
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::LABELS as $value => $label) {
            $options[] = [
                'value' => $value,
                'label' => $label,
            ];
        }

        return $options;
    }

    public static function label(?string $value): string
    {
        if (! $value) {
            return 'Não informada';
        }

        return self::LABELS[$value] ?? $value;
    }
}
