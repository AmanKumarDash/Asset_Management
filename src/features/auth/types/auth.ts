import type { AuthSession } from "@/models/session";
import type {
  AppPermission,
  AppUser,
  RoleBadge,
  UserRole,
} from "@/models/user";

export type { AuthSession, AppPermission, AppUser, RoleBadge, UserRole };

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
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signOut: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
  hasPermission: (permission: AppPermission) => boolean;
};
