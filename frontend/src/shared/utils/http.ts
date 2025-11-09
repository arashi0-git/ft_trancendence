import { ApiError } from "./api-error";

export async function expectJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  let data: unknown = null;
  let parseError: unknown;

  try {
    data = await response.json();
  } catch (error) {
    parseError = error;
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response, data);
  }

  if (parseError) {
    throw new ApiError("Invalid response from server", {
      status: response.status,
      details: parseError,
    });
  }

  return data as T;
}
