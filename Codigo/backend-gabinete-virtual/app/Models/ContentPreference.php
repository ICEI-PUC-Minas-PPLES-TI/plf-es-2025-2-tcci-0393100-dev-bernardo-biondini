<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class ContentPreference
 * 
 * @property int $id
 * @property int $citizen_id
 * @property bool $receive_content
 * 
 * @property Citizen $citizen
 *
 * @package App\Models
 */
class ContentPreference extends Model
{
	protected $table = 'content_preferences';
	public $timestamps = false;

	protected $casts = [
		'citizen_id' => 'int',
		'receive_content' => 'bool'
	];

	protected $fillable = [
		'citizen_id',
		'receive_content'
	];

	public function citizen()
	{
		return $this->belongsTo(Citizen::class);
	}
}
