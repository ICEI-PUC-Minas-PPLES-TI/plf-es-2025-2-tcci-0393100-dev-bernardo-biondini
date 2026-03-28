<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class City
 * 
 * @property int $id
 * @property string $name
 * @property string $region
 * 
 * @property Collection|Amendment[] $amendments
 * @property Collection|Demand[] $demands
 * @property Collection|Institution[] $institutions
 *
 * @package App\Models
 */
class City extends Model
{
	protected $table = 'cities';
	public $timestamps = false;

	protected $fillable = [
		'name',
		'region'
	];

	public function amendments()
	{
		return $this->hasMany(Amendment::class);
	}

	public function demands()
	{
		return $this->hasMany(Demand::class);
	}

	public function institutions()
	{
		return $this->hasMany(Institution::class);
	}
}
