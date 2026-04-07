import { isAxiosError } from "axios";

export type ApiEnvelope<T> = {
  data?: T;
  Data?: T;
  message?: string;
  Message?: string;
} & Partial<T>;

export type ApiCollectionEnvelope<T> = ApiEnvelope<T[]> & {
  items?: T[];
  Items?: T[];
  result?: T[];
  Result?: T[];
  rows?: T[];
  Rows?: T[];
  list?: T[];
  List?: T[];
  value?: T[];
  Value?: T[];
};

// Unwraps single-object API responses even when backend uses different envelope casing conventions.
export function extractResponseData<T>(payload: ApiEnvelope<T> | T): T {
  const envelope = payload as ApiEnvelope<T>;
  return envelope.data ?? envelope.Data ?? (payload as T);
}

// Unwraps list responses from several common backend envelope shapes and falls back to an empty array.
export function extractResponseCollection<T>(
  payload: ApiCollectionEnvelope<T> | T[]
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  const envelope = payload as ApiCollectionEnvelope<T>;
  const candidates: Array<T[] | undefined> = [
    envelope.data,
    envelope.Data,
    envelope.items,
    envelope.Items,
    envelope.result,
    envelope.Result,
    envelope.rows,
    envelope.Rows,
    envelope.list,
    envelope.List,
    envelope.value,
    envelope.Value,
  ];

  const collection = candidates.find((value) => Array.isArray(value));
  return collection ?? [];
}

function sanitizeApiMessage(message: string) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return "";
  }

  const firstLine = trimmedMessage.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const withoutStackTrace = firstLine.split("----", 1)[0]?.trim() ?? firstLine;

  return withoutStackTrace || trimmedMessage;
}

// Converts unknown axios and runtime errors into a safe user-facing message for forms and screens.
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again."
) {
  if (isAxiosError<{ message?: string; Message?: string }>(error)) {
    const responseMessage =
      error.response?.data?.message || error.response?.data?.Message;

    return (
      (responseMessage ? sanitizeApiMessage(responseMessage) : null) ||
      sanitizeApiMessage(error.message) ||
      fallbackMessage
    );
  }

  if (error instanceof Error) {
    return sanitizeApiMessage(error.message) || fallbackMessage;
  }

  return fallbackMessage;
}