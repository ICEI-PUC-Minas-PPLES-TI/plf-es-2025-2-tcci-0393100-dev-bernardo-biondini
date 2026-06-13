<?php

namespace App\Http\Requests\Concerns;

trait AuthorizesPermission
{
    protected function authorizePermission(string $permissionCode): bool
    {
        return $this->user()?->hasPermission($permissionCode) ?? false;
    }
}
