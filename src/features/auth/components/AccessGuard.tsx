import { ReactNode } from "react";
import { Redirect } from "expo-router";
import { appLogger } from "@/utils/appLogger";
import { useAuthSession } from "../hooks/useAuthSession";
import { AppPermission, UserRole } from "../types/auth";

type AccessGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: AppPermission[];
};

export default function AccessGuard({
  children,
  allowedRoles,
  requiredPermissions,
}: AccessGuardProps) {
  const { user, hasPermission } = useAuthSession();

  if (!user) {
    appLogger.warn("AccessGuard", "Redirecting to login because no active session was found.");
    return <Redirect href="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    appLogger.warn("AccessGuard", "Blocked route because the user role is not allowed.", {
      role: user.role,
      allowedRoles,
    });
    return <Redirect href="/dashboard" />;
  }

  if (
    requiredPermissions &&
    requiredPermissions.some((permission) => !hasPermission(permission))
  ) {
    appLogger.warn("AccessGuard", "Blocked route because the user is missing a required permission.", {
      role: user.role,
      requiredPermissions,
    });
    return <Redirect href="/dashboard" />;
  }

  return <>{children}</>;
}
