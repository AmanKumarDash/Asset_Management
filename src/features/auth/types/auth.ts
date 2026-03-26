export type UserRole = "admin" | "employee";

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
  roleBadge: "Admin" | "Employee";
  email: string;
  employeeId: string;
  department: string;
  phone: string;
  location: string;
  avatarBg: string;
  avatarText: string;
  permissions: AppPermission[];
};

export type SignInInput = {
  identifier: string;
  password: string;
};

export type AuthSessionContextValue = {
  user: AppUser | null;
  signIn: (input: SignInInput) => boolean;
  signOut: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
  hasPermission: (permission: AppPermission) => boolean;
};
