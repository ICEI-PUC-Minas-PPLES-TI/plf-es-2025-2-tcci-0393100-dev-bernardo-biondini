<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class Leader
 * 
 * @property int $id
 * @property string $name
 * @property string $position
 * @property int $institution_id
 * 
 * @property Institution $institution
 *
 * @package App\Models
 */
class Leader extends Model
{
	protected $table = 'leaders';
	public $timestamps = false;

	protected $casts = [
		'institution_id' => 'int'
	];

	protected $fillable = [
		'name',
		'position',
		'institution_id'
	];

	public function institution()
	{
		return $this->belongsTo(Institution::class);
	}
}
