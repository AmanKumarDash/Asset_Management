import { USER_ROLES } from "@/constants/auth";
import { UserRole } from "@/models/user";

export type AppNavItem = {
  label: string;
  href: string;
  icon: "grid" | "users" | "check-square" | "bar-chart-2" | "user";
};

const adminDesktopNavItems: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "grid",
  },
  {
    label: "Employees",
    href: "/employees",
    icon: "users",
  },
  {
    label: "Audits",
    href: "/audits",
    icon: "check-square",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "bar-chart-2",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "user",
  },
] as const;

const employeeDesktopNavItems: AppNavItem[] = [
  {
    label: "My Dashboard",
    href: "/dashboard",
    icon: "grid",
  },
  {
    label: "Scan Assets",
    href: "/audits",
    icon: "check-square",
  },
  {
    label: "My Reports",
    href: "/reports",
    icon: "bar-chart-2",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "user",
  },
] as const;

const adminMobileNavItems: AppNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: "grid",
  },
  {
    label: "Employees",
    href: "/employees",
    icon: "users",
  },
  {
    label: "Audit",
    href: "/audits",
    icon: "check-square",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "bar-chart-2",
  },
] as const;

const employeeMobileNavItems: AppNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: "grid",
  },
  {
    label: "Scan",
    href: "/audits",
    icon: "check-square",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "user",
  },
] as const;

export function getDesktopNavItems(role: UserRole) {
  return role === USER_ROLES.ADMIN ? adminDesktopNavItems : employeeDesktopNavItems;
}

export function getMobileNavItems(role: UserRole) {
  return role === USER_ROLES.ADMIN ? adminMobileNavItems : employeeMobileNavItems;
}
