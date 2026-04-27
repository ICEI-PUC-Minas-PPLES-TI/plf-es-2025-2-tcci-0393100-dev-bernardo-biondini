<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SiteProject extends Model
{
    public const STATUSES = [
        'planned',
        'in_progress',
        'completed',
    ];

    protected $table = 'site_projects';

    protected $fillable = [
        'title',
        'description',
        'status',
        'city_id',
        'cover_image_path',
        'author_id',
    ];

    protected $casts = [
        'city_id' => 'int',
        'author_id' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'cover_image_url',
    ];

    protected $hidden = [
        'cover_image_path',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function getCoverImageUrlAttribute(): ?string
    {
        if (!$this->cover_image_path) {
            return null;
        }

        return Storage::disk('public')->url($this->cover_image_path);
    }
}
