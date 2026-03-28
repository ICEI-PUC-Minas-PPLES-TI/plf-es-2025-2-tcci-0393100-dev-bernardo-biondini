import type { AccessProfileType } from "./access-profile";

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

export interface AuthApiResponseType {
  message: string;
  token: string;
  token_type: string;
  user: AuthUserType;
}
