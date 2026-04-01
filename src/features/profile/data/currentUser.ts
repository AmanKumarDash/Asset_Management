import { ROLE_BADGES, USER_ROLES } from "@/constants/auth";
import { AppUser } from "@/models/user";
import { adminTheme } from "@/theme/adminTheme";

export const currentUser: AppUser = {
  initials: "AS",
  name: "Aman",
  role: USER_ROLES.ADMIN,
  roleBadge: ROLE_BADGES[USER_ROLES.ADMIN],
  email: "aman@company.com",
  employeeId: "ADM-0001",
  department: "Asset Management",
  phone: "+91 98765 43210",
  location: "Block A - Head Office",
  avatarBg: adminTheme.accentGold,
  avatarText: "#ffffff",
  permissions: [],
};
