<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Institution
 * 
 * @property int $id
 * @property string $name
 * @property string $type
 * @property int $city_id
 * 
 * @property City $city
 * @property Collection|Demand[] $demands
 * @property Collection|Leader[] $leaders
 *
 * @package App\Models
 */
class Institution extends Model
{
	protected $table = 'institutions';
	public $timestamps = false;

	protected $casts = [
		'city_id' => 'int'
	];

	protected $fillable = [
		'name',
		'type',
		'city_id'
	];

	public function city()
	{
		return $this->belongsTo(City::class);
	}

	public function demands()
	{
		return $this->hasMany(Demand::class);
	}

	public function leaders()
	{
		return $this->hasMany(Leader::class);
	}
}
