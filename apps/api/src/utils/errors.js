export class AppError extends Error {
  constructor(message, { status = 500, publicMessage } = {}) {
    super(message);
    this.status = status;
    this.publicMessage = publicMessage ?? message;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { status: 401, publicMessage: message });
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Quota exceeded') {
    super(message, { status: 429, publicMessage: message });
  }
}
