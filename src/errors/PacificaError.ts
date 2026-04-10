export class PacificaError extends Error {
  public readonly statusCode: number | undefined;
  public readonly body: unknown;

  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message);
    this.name = "PacificaError";
    this.statusCode = statusCode;
    this.body = body;
    Object.setPrototypeOf(this, PacificaError.prototype);
  }
}

export class PacificaNetworkError extends PacificaError {
  constructor(cause: Error) {
    super(`Network error: ${cause.message}`);
    this.name = "PacificaNetworkError";
    Object.setPrototypeOf(this, PacificaNetworkError.prototype);
  }
}

export class PacificaSigningError extends PacificaError {
  constructor(message: string) {
    super(message);
    this.name = "PacificaSigningError";
    Object.setPrototypeOf(this, PacificaSigningError.prototype);
  }
}
