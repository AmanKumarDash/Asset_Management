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

async function clearPersistedAuthTokens() {
  await Promise.all([
    secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
    secureStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN),
    storage.removeItem(STORAGE_KEYS.AUTH_ACCESS_TOKEN_EXPIRES_AT),
    storage.removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN_EXPIRES_AT),
    storage.removeItem(STORAGE_KEYS.AUTH_USER),
  ]);
}

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

export function assertApiBaseUrlConfigured() {
  if (API_BASE_URL) {
    return;
  }

  throw new Error(
    "Missing EXPO_PUBLIC_API_URL. Add it to your Expo env before making API calls."
  );
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export const axiosInstance = axios.create(baseConfig);

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
