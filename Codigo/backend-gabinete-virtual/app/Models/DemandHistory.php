<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandHistory extends Model
{
    protected $table = 'demand_histories';

    protected $casts = [
        'demand_id' => 'int',
        'user_id' => 'int',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $fillable = [
        'demand_id',
        'user_id',
        'action',
        'description',
        'metadata',
    ];

    public function demand()
    {
        return $this->belongsTo(Demand::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
