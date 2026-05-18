<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Demand
 * 
 * @property int $id
 * @property string $title
 * @property string $description
 * @property string|null $service_area
 * @property string $status
 * @property string|null $priority
 * @property int|null $responsible_user_id
 * @property int $city_id
 * @property int $institution_id
 * @property int|null $created_by_user_id
 * @property int|null $created_by_citizen_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * 
 * @property City $city
 * @property Citizen|null $citizen
 * @property User|null $user
 * @property Institution $institution
 * @property Collection|Event[] $events
 * @property Collection|DemandHistory[] $histories
 * @property Collection|Notification[] $notifications
 *
 * @package App\Models
 */
class Demand extends Model
{
	protected $table = 'demands';

	protected $casts = [
		'responsible_user_id' => 'int',
		'city_id' => 'int',
		'institution_id' => 'int',
		'created_by_user_id' => 'int',
		'created_by_citizen_id' => 'int'
	];

	protected $fillable = [
		'title',
		'description',
		'service_area',
		'status',
		'priority',
		'responsible_user_id',
		'city_id',
		'institution_id',
		'created_by_user_id',
		'created_by_citizen_id'
	];

	public function city()
	{
		return $this->belongsTo(City::class);
	}

	public function citizen()
	{
		return $this->belongsTo(Citizen::class, 'created_by_citizen_id');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'responsible_user_id');
	}

	public function institution()
	{
		return $this->belongsTo(Institution::class);
	}

	public function events()
	{
		return $this->belongsToMany(Event::class);
	}

	public function histories()
	{
		return $this->hasMany(DemandHistory::class);
	}

	public function notifications()
	{
		return $this->hasMany(Notification::class);
	}
}
