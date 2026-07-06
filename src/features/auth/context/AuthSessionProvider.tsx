import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "@/constants/storage";
import { OrganizationDetails } from "@/models/organization";
import { RfidMachineSummary } from "@/models/rfidMachine";
import { AuthSession } from "@/models/session";
import { WarehouseSummary } from "@/models/warehouse";
import { AppPermission, AppUser } from "@/models/user";
import { apiService } from "@/network/ApiService";
import { setAccessToken, setSessionExpiredHandler } from "@/network/axiosConfig";
import { getApiErrorMessage } from "@/network/responses";
import { secureStorage } from "@/storage/secureStorage";
import { storage } from "@/storage/storage";
import { appLogger } from "@/utils/appLogger";
import { normalizeWarehouses } from "@/utils/warehouseSummary";
import { mapLoginResponse } from "../utils/authMapper";
import { AuthSessionContextValue, SignInInput, SignInResult } from "../types/auth";

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(
  null
);

// Generates avatar initials from the user's display name whenever profile data changes.
function deriveInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Owns auth/session state for the whole app, including token hydration and org bootstrap.
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [accessibleWarehouses, setAccessibleWarehouses] = useState<WarehouseSummary[]>([]);
  const [rfidMachines, setRfidMachines] = useState<RfidMachineSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Restores the last known session from storage so refresh/login is not required on every app launch.
    const hydrateSession = async () => {
      const [
        storedToken,
        storedRefreshToken,
        storedUser,
        storedOrganization,
        storedWarehouseAccess,
        storedRfidMachines,
      ] =
        await Promise.all([
          secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
          secureStorage.getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
          storage.getObject<AppUser>(STORAGE_KEYS.AUTH_USER),
          storage.getObject<OrganizationDetails>(STORAGE_KEYS.AUTH_ORGANIZATION),
          storage.getObject<WarehouseSummary[]>(STORAGE_KEYS.AUTH_WAREHOUSE_ACCESS),
          storage.getObject<RfidMachineSummary[]>(STORAGE_KEYS.AUTH_RFID_MACHINES),
        ]);

      if (!isMounted) {
        return;
      }

      setAccessToken(storedToken);
      setUser(storedUser);
      setOrganization(storedOrganization);
      setAccessibleWarehouses(storedWarehouseAccess ?? []);
      setRfidMachines(storedRfidMachines ?? []);
      setIsHydrated(true);

      appLogger.info("AuthSession", "Hydrated auth session from storage.", {
        hasToken: Boolean(storedToken),
        hasRefreshToken: Boolean(storedRefreshToken),
        hasUser: Boolean(storedUser),
        hasOrganization: Boolean(storedOrganization),
        warehouseAccessCount: storedWarehouseAccess?.length ?? 0,
        rfidMachineCount: storedRfidMachines?.length ?? 0,
      });
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persists the current user and token metadata after login so session state survives app restarts.
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

  // Persists organization details separately because they are loaded after login and reused across screens.
  const persistOrganization = useCallback(async (value: OrganizationDetails | null) => {
    if (value) {
      await storage.setObject(STORAGE_KEYS.AUTH_ORGANIZATION, value);
      return;
    }

    await storage.removeItem(STORAGE_KEYS.AUTH_ORGANIZATION);
  }, []);

  const persistWarehouseAccess = useCallback(async (value: WarehouseSummary[]) => {
    await storage.setObject(STORAGE_KEYS.AUTH_WAREHOUSE_ACCESS, value);
  }, []);

  const persistRfidMachines = useCallback(async (value: RfidMachineSummary[]) => {
    await storage.setObject(STORAGE_KEYS.AUTH_RFID_MACHINES, value);
  }, []);

  // Removes all persisted auth-related data during sign-out and expired-session cleanup.
  const clearSession = useCallback(async () => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.AUTH_USER),
      storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
      storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
      storage.removeItem(STORAGE_KEYS.AUTH_ORGANIZATION),
      storage.removeItem(STORAGE_KEYS.AUTH_WAREHOUSE_ACCESS),
      storage.removeItem(STORAGE_KEYS.AUTH_RFID_MACHINES),
      secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
    ]);
  }, []);

  const loadWarehouseAccessForUser = useCallback(
    async (userId: string) => {
      const normalizedUserId = userId.trim();

      if (!normalizedUserId) {
        setAccessibleWarehouses([]);
        await persistWarehouseAccess([]);
        return [];
      }

      const payload = await apiService.getWarehouseAccessByUser(normalizedUserId);
      const normalizedWarehouses = normalizeWarehouses(payload);

      setAccessibleWarehouses(normalizedWarehouses);
      await persistWarehouseAccess(normalizedWarehouses);

      appLogger.info("AuthSession", "Loaded warehouse access for user.", {
        userId: normalizedUserId,
        warehouseCount: normalizedWarehouses.length,
      });

      return normalizedWarehouses;
    },
    [persistWarehouseAccess]
  );

  // Refreshes organization details on demand so profile and audit screens can reuse one shared source of truth.
  const refreshOrganization = useCallback(async () => {
    try {
      const payload = await apiService.getOrganizationDetails();
      setOrganization(payload);
      await persistOrganization(payload);

      appLogger.info("AuthSession", "Loaded organization details.", {
        organizationId: payload.Id,
        organizationName: payload.Name,
      });

      return payload;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to load organization details right now."
      );

      appLogger.warn("AuthSession", "Organization fetch failed.", {
        message,
      });

      return null;
    }
  }, [persistOrganization]);

  useEffect(() => {
    // Gives the axios layer a way to clear app state when token refresh can no longer recover the session.
    setSessionExpiredHandler(() => {
      setAccessToken(null);
      setUser(null);
      setOrganization(null);
      setAccessibleWarehouses([]);
      setRfidMachines([]);
      void clearSession();
    });

    return () => {
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);

  const refreshWarehouseAccess = useCallback(async () => {
    try {
      if (!user?.employeeId?.trim()) {
        setAccessibleWarehouses([]);
        await persistWarehouseAccess([]);
        return [];
      }

      return await loadWarehouseAccessForUser(user.employeeId);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to load warehouse access right now."
      );

      appLogger.warn("AuthSession", "Warehouse access fetch failed.", {
        userId: user?.employeeId ?? "",
        message,
      });

      throw error;
    }
  }, [loadWarehouseAccessForUser, persistWarehouseAccess, user?.employeeId]);

  const refreshRfidMachines = useCallback(async () => {
    try {
      const machines = await apiService.getRfidMachinesByOrg();

      setRfidMachines(machines);
      await persistRfidMachines(machines);

      appLogger.info("AuthSession", "Loaded RFID machines for organization.", {
        rfidMachineCount: machines.length,
        topics: machines.map((machine) => machine.topic),
      });

      return machines;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to load RFID machines right now."
      );

      appLogger.warn("AuthSession", "RFID machine fetch failed.", {
        message,
      });

      throw error;
    }
  }, [persistRfidMachines]);

  // Handles login, session persistence, and the follow-up organization bootstrap required by the app.
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
        setOrganization(null);
        setAccessibleWarehouses([]);
        setRfidMachines([]);
        await persistSession(session);
        await persistOrganization(null);
        await persistWarehouseAccess([]);
        await persistRfidMachines([]);

        const [organizationPayload, warehouseAccessPayload, rfidMachinePayload] = await Promise.all([
          refreshOrganization(),
          loadWarehouseAccessForUser(session.user.employeeId).catch((error) => {
            const message = getApiErrorMessage(
              error,
              "Unable to load warehouse access right now."
            );

            appLogger.warn("AuthSession", "Warehouse access bootstrap failed after sign-in.", {
              userId: session.user.employeeId,
              message,
            });

            return [];
          }),
          apiService.getRfidMachinesByOrg().catch((error) => {
            const message = getApiErrorMessage(
              error,
              "Unable to load RFID machines right now."
            );

            appLogger.warn("AuthSession", "RFID machine bootstrap failed after sign-in.", {
              message,
            });

            return [];
          }),
        ]);

        setRfidMachines(rfidMachinePayload);
        await persistRfidMachines(rfidMachinePayload);

        appLogger.info("AuthSession", "User signed in successfully.", {
          role: session.user.role,
          email: session.user.email,
          hasRefreshToken: Boolean(session.refreshToken),
          accessTokenExpiresAt: session.accessTokenExpiresAt,
          refreshTokenExpiresAt: session.refreshTokenExpiresAt,
          hasOrganization: Boolean(organizationPayload),
          warehouseAccessCount: warehouseAccessPayload.length,
          rfidMachineCount: rfidMachinePayload.length,
        });

        return { success: true };
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          "Unable to sign in right now. Please try again."
        );

        setAccessToken(null);
        setUser(null);
        setOrganization(null);
        setAccessibleWarehouses([]);
        setRfidMachines([]);
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
    [
      clearSession,
      loadWarehouseAccessForUser,
      persistOrganization,
      persistRfidMachines,
      persistSession,
      persistWarehouseAccess,
      refreshOrganization,
    ]
  );

  // Clears in-memory and persisted session state when the user leaves the app intentionally.
  const signOut = useCallback(() => {
    appLogger.info("AuthSession", "User signed out.", {
      email: user?.email ?? "unknown",
    });
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
    setAccessibleWarehouses([]);
    setRfidMachines([]);
    void clearSession();
  }, [clearSession, user]);

  // Updates the local user profile snapshot and re-derives initials for headers and avatars.
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

  // Small helper used by protected screens to check role-based capabilities from the current session.
  const hasPermission = useCallback((permission: AppPermission) => {
    return user?.permissions.includes(permission) ?? false;
  }, [user]);

  const value = useMemo(
    () => ({
      isHydrated,
      user,
      organization,
      accessibleWarehouses,
      rfidMachines,
      signIn,
      signOut,
      updateUser,
      refreshOrganization,
      refreshWarehouseAccess,
      refreshRfidMachines,
      hasPermission,
    }),
    [
      accessibleWarehouses,
      hasPermission,
      isHydrated,
      organization,
      rfidMachines,
      refreshOrganization,
      refreshRfidMachines,
      refreshWarehouseAccess,
      signIn,
      signOut,
      updateUser,
      user,
    ]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
