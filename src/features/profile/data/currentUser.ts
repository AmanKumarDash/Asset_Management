import { adminTheme } from "@/theme/adminTheme";

export type CurrentUser = {
  initials: string;
  name: string;
  role: string;
  roleBadge: string;
  email: string;
  employeeId: string;
  department: string;
  phone: string;
  location: string;
  avatarBg: string;
  avatarText: string;
};

export const currentUser: CurrentUser = {
  initials: "AS",
  name: "Aman",
  role: "Admin",
  roleBadge: "Admin",
  email: "aman@company.com",
  employeeId: "ADM-0001",
  department: "Asset Management",
  phone: "+91 98765 43210",
  location: "Block A - Head Office",
  avatarBg: adminTheme.accentGold,
  avatarText: "#ffffff",
};
