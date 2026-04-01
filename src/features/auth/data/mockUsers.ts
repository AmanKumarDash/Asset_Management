import { DEFAULT_PERMISSIONS_BY_ROLE, ROLE_BADGES, USER_ROLES } from "@/constants/auth";
import { AppUser } from "@/models/user";
import { adminTheme } from "@/theme/adminTheme";

export const mockUsers: AppUser[] = [
  {
    initials: "AS",
    name: "Alka Sharma",
    role: USER_ROLES.ADMIN,
    roleBadge: ROLE_BADGES[USER_ROLES.ADMIN],
    email: "alka@company.com",
    employeeId: "ADM-0001",
    department: "Asset Management",
    phone: "+91 98765 43210",
    location: "Block A - Head Office",
    avatarBg: adminTheme.accentGold,
    avatarText: "#ffffff",
    permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[USER_ROLES.ADMIN]],
  },
  {
    initials: "AM",
    name: "Aman",
    role: USER_ROLES.EMPLOYEE,
    roleBadge: ROLE_BADGES[USER_ROLES.EMPLOYEE],
    email: "aman@company.com",
    employeeId: "EMP-0001",
    department: "Frontend Dev",
    phone: "+91 98123 45678",
    location: "Block A - Floor 3",
    avatarBg: adminTheme.employeePrimary,
    avatarText: "#ffffff",
    permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[USER_ROLES.EMPLOYEE]],
  },
];
