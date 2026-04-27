<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Event
 * 
 * @property int $id
 * @property string $title
 * @property string $type
 * @property Carbon $event_at
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property string $location
 * @property string $context
 * @property string|null $description
 * @property int|null $participants_expected
 * @property string|null $color
 * @property int|null $city_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * 
 * @property City|null $city
 * @property Collection|Demand[] $demands
 * @property Collection|EventAlert[] $alerts
 *
 * @package App\Models
 */
class Event extends Model
{
	protected $table = 'events';

	protected $casts = [
		'event_at' => 'datetime',
		'starts_at' => 'datetime',
		'ends_at' => 'datetime',
		'participants_expected' => 'int',
		'city_id' => 'int',
	];

	protected $fillable = [
		'title',
		'type',
		'event_at',
		'starts_at',
		'ends_at',
		'location',
		'context',
		'description',
		'participants_expected',
		'color',
		'city_id',
	];

	public function city()
	{
		return $this->belongsTo(City::class);
	}

	public function demands()
	{
		return $this->belongsToMany(Demand::class);
	}

	public function alerts()
	{
		return $this->hasMany(EventAlert::class);
	}
}
