<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsSection extends Model
{
    public const KEY_DEPUTY_NAME = 'deputy_name';
    public const KEY_DEPUTY_ROLE = 'deputy_role';
    public const KEY_HERO_TITLE = 'hero_title';
    public const KEY_HERO_SUMMARY = 'hero_summary';
    public const KEY_HERO_IMAGE_URL = 'hero_image_url';
    public const KEY_HERO_IMAGE_ALT = 'hero_image_alt';
    public const KEY_BIOGRAPHY = 'biography';
    public const KEY_PRIORITIES = 'priorities';
    public const KEY_QUOTE = 'quote';
    public const KEY_MISSION = 'mission';
    public const KEY_TRAJECTORY = 'trajectory';

    public const DEFINITIONS = [
        self::KEY_DEPUTY_NAME => 'Nome da Deputada',
        self::KEY_DEPUTY_ROLE => 'Cargo Exibido',
        self::KEY_HERO_TITLE => 'Titulo Principal',
        self::KEY_HERO_SUMMARY => 'Resumo de Abertura',
        self::KEY_HERO_IMAGE_URL => 'URL da Imagem Principal',
        self::KEY_HERO_IMAGE_ALT => 'Descricao da Imagem Principal',
        self::KEY_BIOGRAPHY => 'Biografia',
        self::KEY_PRIORITIES => 'Prioridades do Mandato',
        self::KEY_QUOTE => 'Citação em Destaque',
        self::KEY_MISSION => 'Missao',
        self::KEY_TRAJECTORY => 'Trajetoria',
    ];

    protected $table = 'cms_sections';

    protected $fillable = [
        'key',
        'title',
        'content',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
