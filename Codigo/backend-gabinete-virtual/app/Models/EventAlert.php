<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventAlert extends Model
{
    protected $table = 'event_alerts';

    protected $casts = [
        'event_id' => 'int',
        'alert_at' => 'datetime',
        'lead_time_minutes' => 'int',
        'is_recurring' => 'boolean',
    ];

    protected $fillable = [
        'event_id',
        'title',
        'message',
        'alert_at',
        'lead_time_minutes',
        'channel',
        'is_recurring',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
