import type { AccessProfileType } from "@/app/types/access-profile/access-profile-type";

export interface AuthUserType {
  id: number;
  name: string;
  email: string;
  access_profile_id: number;
  access_profile: AccessProfileType | null;
  permissions: string[];
  created_at: string;
  updated_at: string;
}
