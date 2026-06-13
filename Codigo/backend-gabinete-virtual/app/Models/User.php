<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory;
    use Notifiable;

    protected $table = 'users';

    protected $casts = [
        'access_profile_id' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $hidden = [
        'password',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'access_profile_id',
    ];

    public function access_profile()
    {
        return $this->belongsTo(AccessProfile::class);
    }

    public function demands()
    {
        return $this->hasMany(Demand::class, 'responsible_user_id');
    }

    public function apiTokens()
    {
        return $this->hasMany(ApiToken::class);
    }

    public function demandHistories()
    {
        return $this->hasMany(DemandHistory::class);
    }

    public function news()
    {
        return $this->hasMany(News::class, 'author_id');
    }

    public function demandAlerts()
    {
        return $this->hasMany(DemandAlert::class);
    }

    public function eventAlerts()
    {
        return $this->hasMany(EventAlert::class);
    }

    public function siteProjects()
    {
        return $this->hasMany(SiteProject::class, 'author_id');
    }

    public function getPermissionCodesAttribute(): array
    {
        $permissions = $this->relationLoaded('access_profile')
            ? $this->access_profile?->permissions
            : $this->access_profile()->with('permissions')->first()?->permissions;

        return $permissions?->pluck('code')->values()->all() ?? [];
    }

    public function hasPermission(string $permissionCode): bool
    {
        return in_array($permissionCode, $this->permission_codes, true);
    }
}
