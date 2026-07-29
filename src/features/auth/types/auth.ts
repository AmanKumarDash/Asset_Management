import { OrganizationDetails } from "@/models/organization";
import { RfidMachineSummary } from "@/models/rfidMachine";
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
  isAuthenticated: boolean;
  user: AppUser | null;
  organization: OrganizationDetails | null;
  accessibleWarehouses: WarehouseSummary[];
  rfidMachines: RfidMachineSummary[];
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signOut: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
  refreshOrganization: () => Promise<OrganizationDetails | null>;
  refreshWarehouseAccess: () => Promise<WarehouseSummary[]>;
  refreshRfidMachines: () => Promise<RfidMachineSummary[]>;
  hasPermission: (permission: AppPermission) => boolean;
};
