import { AppUser } from "./user";

export type AuthSession = {
  token: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  user: AppUser;
};
