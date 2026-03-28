<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Attachment
 * 
 * @property int $id
 * @property string $reference_table
 * @property int $reference_id
 * @property string $file_path
 * @property Carbon $created_at
 *
 * @package App\Models
 */
class Attachment extends Model
{
	protected $table = 'attachments';
	public $timestamps = false;

	protected $casts = [
		'reference_id' => 'int'
	];

	protected $fillable = [
		'reference_table',
		'reference_id',
		'file_path'
	];
}
