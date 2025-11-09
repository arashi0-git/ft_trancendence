export interface ApiErrorPayload {
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
  message?: string;
}
//Custom error class for standardizing API responses.
// Enriches errors with HTTP `status` and a translation-friendly `code`.
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options?: { code?: string; status?: number; details?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }

  static fromResponse(response: Response, data: unknown): ApiError {
    const { code, message } = extractErrorInfo(data);
    const fallback = message || `Request failed with status ${response.status}`;
    return new ApiError(fallback, {
      code,
      status: response.status,
      details: data,
    });
  }
}

// Safely parses various error formats from the API to extract a
// standardized `code` (for translation keys) and a `message`.
export function extractErrorInfo(data: unknown): {
  code?: string;
  message?: string;
} {
  if (typeof data === "string") {
    return { message: data };
  }

  if (data && typeof data === "object") {
    const payload = data as ApiErrorPayload;
    if (typeof payload.error === "string") {
      return { message: payload.error };
    }
    if (payload.error && typeof payload.error === "object") {
      const code =
        typeof payload.error.code === "string" ? payload.error.code : undefined;
      const message =
        typeof payload.error.message === "string"
          ? payload.error.message
          : undefined;
      return { code, message };
    }
    if (typeof payload.message === "string") {
      return { message: payload.message };
    }
  }

  return {};
}
