import { ReactNode, createContext, useCallback, useMemo, useState } from "react";
import { appLogger } from "@/utils/appLogger";
import { mockUsers } from "../data/mockUsers";
import {
  AppPermission,
  AppUser,
  AuthSessionContextValue,
  SignInInput,
} from "../types/auth";

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(
  null
);

// Keeps avatar initials derived from the current display name after profile edits.
function deriveInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function findUser(identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  return mockUsers.find(
    (user) =>
      user.email.toLowerCase() === normalized ||
      user.employeeId.toLowerCase() === normalized
  );
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const signIn = ({ identifier }: SignInInput) => {
    const matchedUser = findUser(identifier);

    if (!matchedUser) {
      appLogger.warn("AuthSession", "Sign-in failed because no matching user was found.", {
        identifier,
      });
      return false;
    }

    appLogger.info("AuthSession", "User signed in successfully.", {
      role: matchedUser.role,
      email: matchedUser.email,
    });
    setUser(matchedUser);
    return true;
  };

  const signOut = () => {
    appLogger.info("AuthSession", "User signed out.", {
      email: user?.email ?? "unknown",
    });
    setUser(null);
  };

  const updateUser = (updates: Partial<AppUser>) => {
    setUser((current) => {
      if (!current) {
        appLogger.warn("AuthSession", "Skipped profile update because there is no active user.");
        return current;
      }

      const nextName = updates.name ?? current.name;
      const nextUser = {
        ...current,
        ...updates,
        initials: deriveInitials(nextName),
      };

      appLogger.info("AuthSession", "User profile updated in session state.", {
        email: current.email,
        updatedKeys: Object.keys(updates),
      });

      return nextUser;
    });
  };

  // Central permission lookup keeps role checks out of individual UI widgets.
  const hasPermission = useCallback((permission: AppPermission) => {
    return user?.permissions.includes(permission) ?? false;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      signIn,
      signOut,
      updateUser,
      hasPermission,
    }),
    [hasPermission, user]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
