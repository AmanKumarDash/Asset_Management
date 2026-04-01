const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

export const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : "";

export const API_TIMEOUT_MS = 15000;
