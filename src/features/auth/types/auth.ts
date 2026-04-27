import { OrganizationDetails } from "@/models/organization";
import { WarehouseSummary } from "@/models/warehouse";
import type { AuthSession } from "@/models/session";
import type {
  AppPermission,
  AppUser,
  RoleBadge,
  UserRole,
} from "@/models/user";

export type { AuthSession, AppPermission, AppUser, OrganizationDetails, RoleBadge, UserRole };

export type SignInInput = {
  identifier: string;
  password: string;
};

export type SignInResult = {
  success: boolean;
  message?: string;
};

export type AuthSessionContextValue = {
  isHydrated: boolean;
  user: AppUser | null;
  organization: OrganizationDetails | null;
  accessibleWarehouses: WarehouseSummary[];
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signOut: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
  refreshOrganization: () => Promise<OrganizationDetails | null>;
  refreshWarehouseAccess: () => Promise<WarehouseSummary[]>;
  hasPermission: (permission: AppPermission) => boolean;
};
