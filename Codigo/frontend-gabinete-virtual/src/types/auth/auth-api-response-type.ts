import type { AuthUserType } from "./auth-user-type";

export interface AuthApiResponseType {
  message: string;
  token: string;
  token_type: string;
  user: {
    data: AuthUserType;
  };
}
