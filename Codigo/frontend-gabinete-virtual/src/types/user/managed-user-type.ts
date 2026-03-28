import type { AccessProfileType } from "../access-profile";

export interface ManagedUserType {
  id: number;
  name: string;
  email: string;
  access_profile_id: number;
  access_profile: AccessProfileType | null;
  created_at: string;
  updated_at: string;
}
