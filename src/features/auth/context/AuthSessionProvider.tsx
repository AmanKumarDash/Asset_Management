import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "@/constants/storage";
import { AuthSession } from "@/models/session";
import { AppPermission, AppUser } from "@/models/user";
import { apiService } from "@/network/ApiService";
import { setAccessToken, setSessionExpiredHandler } from "@/network/axiosConfig";
import { getApiErrorMessage } from "@/network/responses";
import { secureStorage } from "@/storage/secureStorage";
import { storage } from "@/storage/storage";
import { appLogger } from "@/utils/appLogger";
import { mapLoginResponse } from "../utils/authMapper";
import { AuthSessionContextValue, SignInInput, SignInResult } from "../types/auth";

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(
  null
);

function deriveInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        secureStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
        storage.getObject<AppUser>(STORAGE_KEYS.AUTH_USER),
      ]);

      if (!isMounted) {
        return;
      }

      setAccessToken(storedToken);
      setUser(storedUser);
      setIsHydrated(true);

      appLogger.info("AuthSession", "Hydrated auth session from storage.", {
        hasToken: Boolean(storedToken),
        hasRefreshToken: Boolean(storedRefreshToken),
        hasUser: Boolean(storedUser),
      });
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = useCallback(async (session: AuthSession) => {
    await Promise.all([
      storage.setObject(STORAGE_KEYS.AUTH_USER, session.user),
      session.token
        ? secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.token)
        : secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      session.refreshToken
        ? secureStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, session.refreshToken)
        : secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
      session.accessTokenExpiresAt
        ? storage.setItem(
            STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT,
            session.accessTokenExpiresAt
          )
        : storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
      session.refreshTokenExpiresAt
        ? storage.setItem(
            STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT,
            session.refreshTokenExpiresAt
          )
        : storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.AUTH_USER),
      storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
      storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
      secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
    ]);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAccessToken(null);
      setUser(null);
      void clearSession();
    });

    return () => {
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);
  const signIn = useCallback(
    async ({ identifier, password }: SignInInput): Promise<SignInResult> => {
      try {
        const payload = await apiService.login({
          Username: identifier.trim(),
          Password: password,
        });
        const session = mapLoginResponse(payload);

        setAccessToken(session.token);
        setUser(session.user);
        await persistSession(session);

        appLogger.info("AuthSession", "User signed in successfully.", {
          role: session.user.role,
          email: session.user.email,
          hasRefreshToken: Boolean(session.refreshToken),
          accessTokenExpiresAt: session.accessTokenExpiresAt,
          refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        });

        return { success: true };
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          "Unable to sign in right now. Please try again."
        );

        setAccessToken(null);
        setUser(null);
        await clearSession();

        appLogger.warn("AuthSession", "Sign-in failed.", {
          identifier,
          message,
        });

        return {
          success: false,
          message,
        };
      }
    },
    [clearSession, persistSession]
  );

  const signOut = useCallback(() => {
    appLogger.info("AuthSession", "User signed out.", {
      email: user?.email ?? "unknown",
    });
    setAccessToken(null);
    setUser(null);
    void clearSession();
  }, [clearSession, user]);

  const updateUser = useCallback((updates: Partial<AppUser>) => {
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

      void storage.setObject(STORAGE_KEYS.AUTH_USER, nextUser);

      appLogger.info("AuthSession", "User profile updated in session state.", {
        email: current.email,
        updatedKeys: Object.keys(updates),
      });

      return nextUser;
    });
  }, []);

  const hasPermission = useCallback((permission: AppPermission) => {
    return user?.permissions.includes(permission) ?? false;
  }, [user]);

  const value = useMemo(
    () => ({
      isHydrated,
      user,
      signIn,
      signOut,
      updateUser,
      hasPermission,
    }),
    [hasPermission, isHydrated, signIn, signOut, updateUser, user]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}


