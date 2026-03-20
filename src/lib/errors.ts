export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message); }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(409, message); }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') { super(429, message); }
}
