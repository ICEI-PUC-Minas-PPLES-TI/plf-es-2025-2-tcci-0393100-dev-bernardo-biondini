<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class News extends Model
{
    protected $table = 'news';

    protected $fillable = [
        'title',
        'content',
        'image_path',
        'published_at',
        'author_id',
    ];

    protected $casts = [
        'author_id' => 'int',
        'published_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'image_url',
    ];

    protected $hidden = [
        'image_path',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        return Storage::disk('public')->url($this->image_path);
    }
}
