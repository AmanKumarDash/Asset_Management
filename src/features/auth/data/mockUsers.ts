import { adminTheme } from "@/theme/adminTheme";
import { AppUser } from "../types/auth";

export const mockUsers: AppUser[] = [
  {
    initials: "AS",
    name: "Alka Sharma",
    role: "admin",
    roleBadge: "Admin",
    email: "alka@company.com",
    employeeId: "ADM-0001",
    department: "Asset Management",
    phone: "+91 98765 43210",
    location: "Block A - Head Office",
    avatarBg: adminTheme.accentGold,
    avatarText: "#ffffff",
    permissions: [
      "view_dashboard",
      "manage_employees",
      "assign_audits",
      "perform_audit",
      "submit_audit",
      "view_all_reports",
      "view_own_reports",
      "manage_profile",
    ],
  },
  {
    initials: "AM",
    name: "Aman",
    role: "employee",
    roleBadge: "Employee",
    email: "aman@company.com",
    employeeId: "EMP-0001",
    department: "Frontend Dev",
    phone: "+91 98123 45678",
    location: "Block A - Floor 3",
    avatarBg: adminTheme.employeePrimary,
    avatarText: "#ffffff",
    permissions: [
      "view_dashboard",
      "perform_audit",
      "submit_audit",
      "view_own_reports",
      "manage_profile",
    ],
  },
];
