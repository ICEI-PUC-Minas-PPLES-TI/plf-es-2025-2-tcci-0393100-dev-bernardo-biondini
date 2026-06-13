<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandAlert extends Model
{
    public const CHANNEL_SYSTEM = 'system';
    public const CHANNEL_CHATBOT = 'chatbot';

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    protected $table = 'demand_alerts';

    protected $fillable = [
        'demand_id',
        'user_id',
        'citizen_id',
        'title',
        'message',
        'type',
        'channel',
        'status',
        'metadata',
        'read_at',
        'sent_at',
        'error_message',
    ];

    protected $casts = [
        'demand_id' => 'int',
        'user_id' => 'int',
        'citizen_id' => 'int',
        'metadata' => 'array',
        'read_at' => 'datetime',
        'sent_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function demand()
    {
        return $this->belongsTo(Demand::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function citizen()
    {
        return $this->belongsTo(Citizen::class);
    }
}
