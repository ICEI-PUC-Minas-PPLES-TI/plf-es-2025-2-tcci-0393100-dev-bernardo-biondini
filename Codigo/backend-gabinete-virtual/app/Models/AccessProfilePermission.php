<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class AccessProfilePermission
 * 
 * @property int $access_profile_id
 * @property int $permission_id
 * 
 * @property AccessProfile $access_profile
 * @property Permission $permission
 *
 * @package App\Models
 */
class AccessProfilePermission extends Model
{
	protected $table = 'access_profile_permission';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'access_profile_id' => 'int',
		'permission_id' => 'int'
	];

	public function access_profile()
	{
		return $this->belongsTo(AccessProfile::class);
	}

	public function permission()
	{
		return $this->belongsTo(Permission::class);
	}
}
