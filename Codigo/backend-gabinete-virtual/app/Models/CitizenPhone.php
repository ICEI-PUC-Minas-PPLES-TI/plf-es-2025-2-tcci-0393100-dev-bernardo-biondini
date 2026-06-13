<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CitizenPhone extends Model
{
    protected $table = 'citizen_phones';
    public $timestamps = false;

    protected $casts = [
        'citizen_id' => 'int',
    ];

    protected $fillable = [
        'citizen_id',
        'phone',
        'normalized_phone',
    ];

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }
}
