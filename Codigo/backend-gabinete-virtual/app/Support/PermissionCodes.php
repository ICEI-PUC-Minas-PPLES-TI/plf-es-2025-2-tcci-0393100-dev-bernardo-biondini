<?php

namespace App\Support;

final class PermissionCodes
{
    public const USERS_VIEW = 'users.view';
    public const USERS_CREATE = 'users.create';
    public const DEMANDS_MANAGE = 'demands.manage';
    public const AMENDMENTS_MANAGE = 'amendments.manage';
    public const PROJECT_LAWS_MANAGE = 'project_laws.manage';
    public const AGENDA_MANAGE = 'agenda.manage';
    public const CMS_MANAGE = 'cms.manage';

    public const ROLES_VIEW = 'roles.view';
    public const ROLES_CREATE = 'roles.create';
    public const ROLES_UPDATE = 'roles.update';
    public const ROLES_DELETE = 'roles.delete';
}
