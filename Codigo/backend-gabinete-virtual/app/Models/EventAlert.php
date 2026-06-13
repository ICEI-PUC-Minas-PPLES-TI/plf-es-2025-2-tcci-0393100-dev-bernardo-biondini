<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventAlert extends Model
{
    protected $table = 'event_alerts';

    public const STATUS_PENDING = 'pending';
    public const STATUS_QUEUED = 'queued';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    protected $casts = [
        'event_id' => 'int',
        'user_id' => 'int',
        'alert_at' => 'datetime',
        'lead_time_minutes' => 'int',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'is_recurring' => 'boolean',
        'is_automatic' => 'boolean',
    ];

    protected $fillable = [
        'event_id',
        'user_id',
        'title',
        'message',
        'alert_at',
        'lead_time_minutes',
        'channel',
        'status',
        'is_automatic',
        'is_recurring',
        'sent_at',
        'read_at',
        'error_message',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
