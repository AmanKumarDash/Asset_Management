type LogLevel = "info" | "warn" | "error";

function writeLog(level: LogLevel, scope: string, message: string, data?: unknown) {
  if (!__DEV__) {
    return;
  }

  const prefix = `[${scope}] ${message}`;

  if (level === "error") {
    console.error(prefix, data ?? "");
    return;
  }

  if (level === "warn") {
    console.warn(prefix, data ?? "");
    return;
  }

  console.log(prefix, data ?? "");
}

export const appLogger = {
  info: (scope: string, message: string, data?: unknown) =>
    writeLog("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    writeLog("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    writeLog("error", scope, message, data),
};
