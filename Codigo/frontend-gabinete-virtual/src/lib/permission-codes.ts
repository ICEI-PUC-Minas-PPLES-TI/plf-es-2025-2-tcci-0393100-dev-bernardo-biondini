export const PERMISSION_CODES = {
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  DEMANDS_MANAGE: "demands.manage",
  AMENDMENTS_MANAGE: "amendments.manage",
  PROJECT_LAWS_MANAGE: "project_laws.manage",
  AGENDA_MANAGE: "agenda.manage",
  CMS_MANAGE: "cms.manage",
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export function hasPermission(
  permissions: string[],
  permissionCode: PermissionCode,
): boolean {
  return permissions.includes(permissionCode);
}
