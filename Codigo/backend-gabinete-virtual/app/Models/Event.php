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
 * @property Carbon $event_at
 * @property string $location
 * @property string $context
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * 
 * @property Collection|Demand[] $demands
 *
 * @package App\Models
 */
class Event extends Model
{
	protected $table = 'events';

	protected $casts = [
		'event_at' => 'datetime'
	];

	protected $fillable = [
		'title',
		'event_at',
		'location',
		'context'
	];

	public function demands()
	{
		return $this->belongsToMany(Demand::class);
	}
}
