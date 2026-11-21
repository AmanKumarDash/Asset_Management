import { useEffect, useRef, useState as useReactState } from "react";
import type { Dispatch, SetStateAction } from "react";

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

const recognizableStateValues = new Set([
  "idle",
  "loading",
  "loaded",
  "success",
  "error",
  "failed",
  "scanning",
  "paused",
  "submitting",
  "submitted",
  "submitError",
  "connected",
  "connecting",
  "reconnecting",
  "closed",
  "camera",
  "rfid",
  "gun",
  "all",
  "found",
  "missing",
  "extra",
]);

function describeStateValue(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return recognizableStateValues.has(value)
      ? value
      : `<string length=${value.length}>`;
  }

  if (Array.isArray(value)) {
    return { type: "array", length: value.length };
  }

  if (typeof value === "function") {
    return "<function>";
  }

  if (typeof value === "object") {
    return {
      type: value.constructor?.name ?? "object",
      keys: Object.keys(value).slice(0, 20),
    };
  }

  return typeof value;
}

function getStateCallsite() {
  const frames = new Error().stack?.split("\n") ?? [];
  const callsite = frames.find(
    (frame, index) =>
      index > 0 &&
      !frame.includes("getStateCallsite") &&
      !frame.includes("appLogger") &&
      !frame.includes("useState")
  );

  return callsite?.trim() ?? "unknown component";
}

/** React useState wrapper that logs committed transitions without printing user-entered values. */
export function useState<T>(
  initialState: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useReactState(initialState);
  const previousStateRef = useRef(state);
  const callsiteRef = useRef("");

  if (__DEV__ && !callsiteRef.current) {
    callsiteRef.current = getStateCallsite();
  }

  useEffect(() => {
    if (!__DEV__ || Object.is(previousStateRef.current, state)) {
      return;
    }

    appLogger.info("State", "React state changed.", {
      source: callsiteRef.current,
      previous: describeStateValue(previousStateRef.current),
      next: describeStateValue(state),
    });
    previousStateRef.current = state;
  }, [state]);

  return [state, setState];
}
