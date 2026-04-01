import { AuthSession } from "@/models/session";

export type AuthApiUser = {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  role?: string;
  Role?: string;
  userType?: number | string;
  UserType?: number | string;
  email?: string;
  Email?: string;
  employeeId?: string;
  EmployeeId?: string;
  department?: string;
  Department?: string;
  phone?: string;
  Phone?: string;
  location?: string;
  Location?: string;
  permissions?: string[];
  Permissions?: string[];
  statusId?: string;
  StatusId?: string;
};

export type LoginResponse = AuthApiUser & {
  token?: string;
  Token?: string;
  accessToken?: string;
  AccessToken?: string;
  accessTokenExpire?: string;
  AccessTokenExpire?: string;
  refreshToken?: string;
  RefreshToken?: string;
  refreshtokenExpire?: string;
  RefreshtokenExpire?: string;
  refreshTokenExpire?: string;
  RefreshTokenExpire?: string;
  user?: AuthApiUser;
  User?: AuthApiUser;
};

export type AuthSessionPayload = AuthSession;
