import type { PermissionType } from "../permission/permission-type";

export interface RoleType {
  id: number;
  name: string;
  description: string;
  permissions: PermissionType[];
}
