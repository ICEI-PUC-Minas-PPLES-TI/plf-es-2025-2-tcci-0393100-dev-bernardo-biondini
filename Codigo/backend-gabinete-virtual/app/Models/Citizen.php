<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Class Citizen
 * 
 * @property int $id
 * @property string $name
 * @property string|null $cpf
 * @property Carbon|null $birth_date
 * @property string|null $phone
 * @property bool $receive_demand_updates
 * @property Carbon $created_at
 * 
 * @property Collection|ChatbotSession[] $chatbot_sessions
 * @property Collection|CitizenPhone[] $phones
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
		'birth_date' => 'datetime',
		'receive_demand_updates' => 'bool',
	];

	protected $fillable = [
		'name',
		'cpf',
		'birth_date',
		'phone',
		'receive_demand_updates',
	];

	public function chatbot_sessions(): HasMany
	{
		return $this->hasMany(ChatbotSession::class);
	}

	public function phones(): HasMany
	{
		return $this->hasMany(CitizenPhone::class);
	}

	public function primaryPhone(): HasOne
	{
		return $this->hasOne(CitizenPhone::class)->oldestOfMany();
	}

	public function content_preference(): HasOne
	{
		return $this->hasOne(ContentPreference::class);
	}

	public function demands(): HasMany
	{
		return $this->hasMany(Demand::class, 'created_by_citizen_id');
	}

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function demandAlerts(): HasMany
    {
        return $this->hasMany(DemandAlert::class);
    }
}
