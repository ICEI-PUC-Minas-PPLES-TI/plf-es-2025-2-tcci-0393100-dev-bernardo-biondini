<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Amendment
 * 
 * @property int $id
 * @property string $number
 * @property float $amount
 * @property string $status
 * @property int $city_id
 * @property string $application_area
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * 
 * @property City $city
 *
 * @package App\Models
 */
class Amendment extends Model
{
	protected $table = 'amendments';

	protected $casts = [
		'amount' => 'float',
		'city_id' => 'int'
	];

	protected $fillable = [
		'number',
		'amount',
		'status',
		'city_id',
		'application_area'
	];

	public function city()
	{
		return $this->belongsTo(City::class);
	}
}
