<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class ChatbotSession
 * 
 * @property int $id
 * @property int $citizen_id
 * @property string $channel
 * @property Carbon $started_at
 * @property Carbon|null $ended_at
 * 
 * @property Citizen $citizen
 *
 * @package App\Models
 */
class ChatbotSession extends Model
{
	protected $table = 'chatbot_sessions';
	public $timestamps = false;

	protected $casts = [
		'citizen_id' => 'int',
		'started_at' => 'datetime',
		'ended_at' => 'datetime'
	];

	protected $fillable = [
		'citizen_id',
		'channel',
		'started_at',
		'ended_at'
	];

	public function citizen()
	{
		return $this->belongsTo(Citizen::class);
	}
}
