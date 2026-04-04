import { API_BASE_URL, API_TIMEOUT_MS } from "@/config/env";
import { STORAGE_KEYS } from "@/constants/storage";
import { secureStorage } from "@/storage/secureStorage";
import { storage } from "@/storage/storage";
import { appLogger } from "@/utils/appLogger";
import axios, {
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import { ENDPOINTS } from "./endpoints";
import { ApiEnvelope, extractResponseData } from "./responses";

// Shared axios defaults keep every request pointed at the same backend and JSON contract.
const baseConfig = {
  baseURL: API_BASE_URL || undefined,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
} as const;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshTokenResponse = {
  token?: string;
  Token?: string;
  accessToken?: string;
  AccessToken?: string;
  accessTokenExpire?: string;
  AccessTokenExpire?: string;
  refreshToken?: string;
  RefreshToken?: string;
  refreshtokenExpire?: string;
  RefreshtokenExpire?: string;
  refreshTokenExpire?: string;
  RefreshTokenExpire?: string;
};

let accessToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Refresh responses are not fully consistent, so this normalizes all known token field names.
function extractTokenBundle(payload: RefreshTokenResponse) {
  return {
    token:
      payload.accessToken ??
      payload.AccessToken ??
      payload.token ??
      payload.Token ??
      null,
    refreshToken: payload.refreshToken ?? payload.RefreshToken ?? null,
    accessTokenExpiresAt:
      payload.accessTokenExpire ?? payload.AccessTokenExpire ?? null,
    refreshTokenExpiresAt:
      payload.refreshtokenExpire ??
      payload.RefreshtokenExpire ??
      payload.refreshTokenExpire ??
      payload.RefreshTokenExpire ??
      null,
  };
}

// Store the latest auth tokens after a successful refresh so the next app launch stays signed in.
async function persistRefreshedTokens(bundle: {
  token: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}) {
  await Promise.all([
    bundle.token
      ? secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, bundle.token)
      : secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
    bundle.refreshToken
      ? secureStorage.setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, bundle.refreshToken)
      : secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
    bundle.accessTokenExpiresAt
      ? storage.setItem(
          STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT,
          bundle.accessTokenExpiresAt
        )
      : storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
    bundle.refreshTokenExpiresAt
      ? storage.setItem(
          STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT,
          bundle.refreshTokenExpiresAt
        )
      : storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
  ]);
}

// Clear all persisted auth state when refresh fails so the app cannot keep using stale credentials.
async function clearPersistedAuthTokens() {
  await Promise.all([
    secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
    secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
    storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
    storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
    storage.removeItem(STORAGE_KEYS.AUTH_USER),
  ]);
}

// Runs a single refresh request for all pending 401s and reuses the same promise until it finishes.
async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefreshToken = await secureStorage.getItem(
      STORAGE_KEYS.AUTH_REFRESH_TOKEN
    );

    if (!currentRefreshToken) {
      return null;
    }

    const refreshClient = axios.create(baseConfig);
    const response = await refreshClient.post<
      ApiEnvelope<RefreshTokenResponse> | RefreshTokenResponse
    >(ENDPOINTS.AUTH.REFRESH, null, {
      params: {
        RefreshToken: currentRefreshToken,
      },
    });

    const payload = extractResponseData<RefreshTokenResponse>(response.data);
    const refreshedBundle = extractTokenBundle(payload);
    const nextToken = refreshedBundle.token;

    if (!nextToken) {
      throw new Error("Refresh response is missing an access token.");
    }

    await persistRefreshedTokens({
      ...refreshedBundle,
      refreshToken: refreshedBundle.refreshToken ?? currentRefreshToken,
    });

    setAccessToken(nextToken);

    appLogger.info("Network", "Access token refreshed successfully.", {
      hasRefreshToken: Boolean(
        refreshedBundle.refreshToken ?? currentRefreshToken
      ),
      accessTokenExpiresAt: refreshedBundle.accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshedBundle.refreshTokenExpiresAt,
    });

    return nextToken;
  })()
    .catch(async (error) => {
      setAccessToken(null);
      await clearPersistedAuthTokens();
      sessionExpiredHandler?.();

      appLogger.warn("Network", "Failed to refresh access token.", {
        message: error instanceof Error ? error.message : String(error),
      });

      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Fail fast with a clear message when the API base URL has not been configured in the environment.
export function assertApiBaseUrlConfigured() {
  if (API_BASE_URL) {
    return;
  }

  throw new Error(
    "Missing EXPO_PUBLIC_API_URL. Add it to your Expo env before making API calls."
  );
}

// Keeps the in-memory bearer token in sync with sign-in, sign-out, and token refresh events.
export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Lets the auth provider decide what should happen when refresh ultimately fails.
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export const axiosInstance = axios.create(baseConfig);

// Inject the latest bearer token into every outgoing request when a session is active.
axiosInstance.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  config.headers = headers;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      Boolean(originalRequest) &&
      !originalRequest?._retry &&
      !requestUrl.includes(ENDPOINTS.AUTH.LOGIN) &&
      !requestUrl.includes(ENDPOINTS.AUTH.REFRESH);

    // Retry once after refresh for normal protected endpoints, but never loop on login/refresh calls.
    if (shouldAttemptRefresh && originalRequest) {
      originalRequest._retry = true;

      const refreshedAccessToken = await refreshAccessToken();

      if (refreshedAccessToken) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", `Bearer ${refreshedAccessToken}`);
        originalRequest.headers = headers;

        return axiosInstance.request(originalRequest);
      }
    }

    appLogger.error("Network", "API request failed.", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status ?? "network",
      message: error.message,
    });

    return Promise.reject(error);
  }
);
