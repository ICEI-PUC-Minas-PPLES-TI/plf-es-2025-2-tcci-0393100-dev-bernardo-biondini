<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Citizen
 * 
 * @property int $id
 * @property string $name
 * @property string|null $cpf
 * @property Carbon|null $birth_date
 * @property string $phone
 * @property Carbon $created_at
 * 
 * @property Collection|ChatbotSession[] $chatbot_sessions
 * @property ContentPreference|null $content_preference
 * @property Collection|Demand[] $demands
 * @property Collection|Notification[] $notifications
 *
 * @package App\Models
 */
class Citizen extends Model
{
	protected $table = 'citizens';
	public $timestamps = false;

	protected $casts = [
		'birth_date' => 'datetime'
	];

	protected $fillable = [
		'name',
		'cpf',
		'birth_date',
		'phone'
	];

	public function chatbot_sessions()
	{
		return $this->hasMany(ChatbotSession::class);
	}

	public function content_preference()
	{
		return $this->hasOne(ContentPreference::class);
	}

	public function demands()
	{
		return $this->hasMany(Demand::class, 'created_by_citizen_id');
	}

	public function notifications()
	{
		return $this->hasMany(Notification::class);
	}
}
