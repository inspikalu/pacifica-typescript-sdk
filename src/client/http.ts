import { PacificaError, PacificaNetworkError } from "../errors/PacificaError.js";

/**
 * Internal fetch wrapper. Sends a POST request with JSON body and throws a
 * typed PacificaError on non-2xx responses.
 */
export async function post<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new PacificaNetworkError(err as Error);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new PacificaError(
      `Pacifica API error ${response.status}`,
      response.status,
      parsed
    );
  }

  return parsed as T;
}

/**
 * Internal fetch wrapper for GET requests.
 */
export async function get<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    throw new PacificaNetworkError(err as Error);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new PacificaError(
      `Pacifica API error ${response.status}`,
      response.status,
      parsed
    );
  }

  return parsed as T;
}
