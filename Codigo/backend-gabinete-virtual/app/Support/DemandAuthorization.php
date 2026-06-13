<?php

namespace App\Support;

use App\Models\Demand;
use App\Models\User;

final class DemandAuthorization
{
    public static function canManage(?User $user): bool
    {
        return $user?->hasPermission(PermissionCodes::DEMANDS_MANAGE) ?? false;
    }

    public static function isOwner(?User $user, ?Demand $demand): bool
    {
        return $user !== null
            && $demand !== null
            && (int) $demand->created_by_user_id === (int) $user->id;
    }

    public static function canEdit(?User $user, ?Demand $demand): bool
    {
        return self::canManage($user) || self::isOwner($user, $demand);
    }

    public static function canView(?User $user, ?Demand $demand): bool
    {
        return self::canManage($user) || self::isOwner($user, $demand);
    }

    public static function canFilterByResponsible(?User $user, ?int $responsibleUserId): bool
    {
        if ($user === null) {
            return false;
        }

        if (self::canManage($user)) {
            return true;
        }

        if ($responsibleUserId === null) {
            return true;
        }

        return (int) $responsibleUserId === (int) $user->id;
    }
}
