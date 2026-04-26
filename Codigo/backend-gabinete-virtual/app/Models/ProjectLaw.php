<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLaw extends Model
{
    public const STATUSES = [
        'in_committee',
        'in_voting',
        'approved',
        'sanctioned',
    ];

    protected $table = 'project_laws';

    protected $fillable = [
        'number',
        'description',
        'status',
        'protocol_date',
    ];

    protected $casts = [
        'protocol_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
