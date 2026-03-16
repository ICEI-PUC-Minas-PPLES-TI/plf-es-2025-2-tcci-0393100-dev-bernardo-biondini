<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class User
 * 
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property int $access_profile_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * 
 * @property AccessProfile $access_profile
 * @property Collection|Demand[] $demands
 *
 * @package App\Models
 */
class User extends Model
{
	protected $table = 'users';

	protected $casts = [
		'access_profile_id' => 'int'
	];

	protected $hidden = [
		'password'
	];

	protected $fillable = [
		'name',
		'email',
		'password',
		'access_profile_id'
	];

	public function access_profile()
	{
		return $this->belongsTo(AccessProfile::class);
	}

	public function demands()
	{
		return $this->hasMany(Demand::class, 'responsible_user_id');
	}
}
