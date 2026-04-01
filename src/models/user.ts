export type UserRole = "admin" | "employee";

export type RoleBadge = "Admin" | "Employee";

export type AppPermission =
  | "view_dashboard"
  | "manage_employees"
  | "assign_audits"
  | "perform_audit"
  | "submit_audit"
  | "view_all_reports"
  | "view_own_reports"
  | "manage_profile";

export type AppUser = {
  initials: string;
  name: string;
  role: UserRole;
  roleBadge: RoleBadge;
  email: string;
  employeeId: string;
  department: string;
  phone: string;
  location: string;
  avatarBg: string;
  avatarText: string;
  permissions: AppPermission[];
};
