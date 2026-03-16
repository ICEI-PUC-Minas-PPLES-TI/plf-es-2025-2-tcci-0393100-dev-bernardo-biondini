<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Permission
 * 
 * @property int $id
 * @property string $code
 * @property string $description
 * 
 * @property Collection|AccessProfile[] $access_profiles
 *
 * @package App\Models
 */
class Permission extends Model
{
	protected $table = 'permissions';
	public $timestamps = false;

	protected $fillable = [
		'code',
		'description'
	];

	public function access_profiles()
	{
		return $this->belongsToMany(AccessProfile::class);
	}
}
