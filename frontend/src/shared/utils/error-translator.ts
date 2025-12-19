import { i18next } from "../../i18n";
import { ApiError } from "./api-error";

export interface ErrorTranslationOptions {
  fallbackKey?: string;
  fallbackMessage?: string;
}

export function translateApiError(
  error: unknown,
  options: ErrorTranslationOptions = {},
): string {
  if (error instanceof ApiError) {
    const statusKeyMap: Record<number, string> = {
      413: "errors.STATUS_413",
    };

    if (typeof error.status === "number" && statusKeyMap[error.status]) {
      const key = statusKeyMap[error.status];
      if (i18next.exists(key)) {
        return i18next.t(key);
      }
    }

    if (error.code) {
      const key = `errors.${error.code}`;
      if (i18next.exists(key)) {
        return i18next.t(key);
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    if (isFailedToFetchMessage(error.message)) {
      return i18next.t(
        "errors.FAILED_TO_FETCH",
        "Failed to connect. Please check your network and try again.",
      );
    }
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    if (isFailedToFetchMessage(error)) {
      return i18next.t(
        "errors.FAILED_TO_FETCH",
        "Failed to connect. Please check your network and try again.",
      );
    }
    return error;
  }

  if (options.fallbackKey && i18next.exists(options.fallbackKey)) {
    return i18next.t(options.fallbackKey);
  }

  if (options.fallbackMessage) {
    return options.fallbackMessage;
  }

  if (i18next.exists("errors.UNKNOWN_ERROR")) {
    return i18next.t("errors.UNKNOWN_ERROR");
  }

  return "Something went wrong. Please try again.";
}

const FAILED_TO_FETCH_MESSAGES = ["failed to fetch", "load failed"];

function isFailedToFetchMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return FAILED_TO_FETCH_MESSAGES.some((candidate) =>
    normalized.includes(candidate),
  );
}
