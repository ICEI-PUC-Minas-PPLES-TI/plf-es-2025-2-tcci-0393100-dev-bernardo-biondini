<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class AccessProfile
 * 
 * @property int $id
 * @property string $name
 * @property string $description
 * 
 * @property Collection|Permission[] $permissions
 * @property Collection|User[] $users
 *
 * @package App\Models
 */
class AccessProfile extends Model
{
	protected $table = 'access_profiles';
	public $timestamps = false;

	protected $fillable = [
		'name',
		'description'
	];

	public function permissions()
	{
		return $this->belongsToMany(Permission::class);
	}

	public function users()
	{
		return $this->hasMany(User::class);
	}
}
