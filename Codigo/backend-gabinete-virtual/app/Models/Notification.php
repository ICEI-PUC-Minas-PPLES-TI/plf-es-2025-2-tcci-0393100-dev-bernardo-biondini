<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Notification
 * 
 * @property int $id
 * @property int $citizen_id
 * @property int $demand_id
 * @property string $message
 * @property Carbon $sent_at
 * @property string $type
 * 
 * @property Citizen $citizen
 * @property Demand $demand
 *
 * @package App\Models
 */
class Notification extends Model
{
	protected $table = 'notifications';
	public $timestamps = false;

	protected $casts = [
		'citizen_id' => 'int',
		'demand_id' => 'int',
		'sent_at' => 'datetime'
	];

	protected $fillable = [
		'citizen_id',
		'demand_id',
		'message',
		'sent_at',
		'type'
	];

	public function citizen()
	{
		return $this->belongsTo(Citizen::class);
	}

	public function demand()
	{
		return $this->belongsTo(Demand::class);
	}
}
