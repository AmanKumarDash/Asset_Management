import {
  DEFAULT_PERMISSIONS_BY_ROLE,
  KNOWN_PERMISSIONS,
  ROLE_BADGES,
  USER_ROLES,
  USER_TYPE_IDS,
} from "@/constants/auth";
import { AppPermission, AppUser, UserRole } from "@/models/user";
import { adminTheme } from "@/theme/adminTheme";
import {
  AuthApiUser,
  AuthSessionPayload,
  LoginResponse,
} from "../types/authApi";

function deriveInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeRole(role?: string, userType?: number | string): UserRole {
  const normalizedRole = role?.trim().toLowerCase();

  if (normalizedRole === USER_ROLES.ADMIN) {
    return USER_ROLES.ADMIN;
  }

  if (normalizedRole === USER_ROLES.EMPLOYEE) {
    return USER_ROLES.EMPLOYEE;
  }

  const normalizedUserType = Number(String(userType ?? "").trim());

  if (normalizedUserType === USER_TYPE_IDS.ADMIN) {
    return USER_ROLES.ADMIN;
  }

  if (normalizedUserType === USER_TYPE_IDS.EMPLOYEE) {
    return USER_ROLES.EMPLOYEE;
  }

  return USER_ROLES.EMPLOYEE;
}

function normalizePermissions(
  role: UserRole,
  permissions?: string[]
): AppPermission[] {
  const validPermissions =
    permissions?.filter((permission): permission is AppPermission =>
      KNOWN_PERMISSIONS.includes(permission as AppPermission)
    ) ?? [];

  return validPermissions.length > 0
    ? validPermissions
    : [...DEFAULT_PERMISSIONS_BY_ROLE[role]];
}

export function mapAuthUser(apiUser: AuthApiUser): AppUser {
  const role = normalizeRole(
    apiUser.role ?? apiUser.Role,
    apiUser.userType ?? apiUser.UserType
  );
  const name = (apiUser.name ?? apiUser.Name)?.trim() || "Unknown User";

  return {
    initials: deriveInitials(name),
    name,
    role,
    roleBadge: ROLE_BADGES[role],
    email: (apiUser.email ?? apiUser.Email)?.trim() ?? "",
    employeeId:
      (apiUser.employeeId ?? apiUser.EmployeeId ?? apiUser.id ?? apiUser.Id)?.trim() ?? "",
    department: (apiUser.department ?? apiUser.Department)?.trim() ?? "",
    phone: (apiUser.phone ?? apiUser.Phone)?.trim() ?? "",
    location: (apiUser.location ?? apiUser.Location)?.trim() ?? "",
    avatarBg:
      role === USER_ROLES.ADMIN
        ? adminTheme.accentGold
        : adminTheme.employeePrimary,
    avatarText: "#ffffff",
    permissions: normalizePermissions(
      role,
      apiUser.permissions ?? apiUser.Permissions
    ),
  };
}

export function mapLoginResponse(payload: LoginResponse): AuthSessionPayload {
  const apiUser = payload.user ?? payload.User ?? payload;

  if (!apiUser) {
    throw new Error("Login response is missing user data.");
  }

  return {
    token:
      payload.accessToken ??
      payload.AccessToken ??
      payload.token ??
      payload.Token ??
      null,
    refreshToken: payload.refreshToken ?? payload.RefreshToken ?? null,
    accessTokenExpiresAt:
      payload.accessTokenExpire ?? payload.AccessTokenExpire ?? null,
    refreshTokenExpiresAt:
      payload.refreshtokenExpire ??
      payload.RefreshtokenExpire ??
      payload.refreshTokenExpire ??
      payload.RefreshTokenExpire ??
      null,
    user: mapAuthUser(apiUser),
  };
}
