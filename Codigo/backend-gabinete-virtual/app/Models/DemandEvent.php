<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class DemandEvent
 * 
 * @property int $demand_id
 * @property int $event_id
 * 
 * @property Demand $demand
 * @property Event $event
 *
 * @package App\Models
 */
class DemandEvent extends Model
{
	protected $table = 'demand_event';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'demand_id' => 'int',
		'event_id' => 'int'
	];

	public function demand()
	{
		return $this->belongsTo(Demand::class);
	}

	public function event()
	{
		return $this->belongsTo(Event::class);
	}
}
