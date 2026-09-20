export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const detail = id ? ` with ID ${id}` : '';
    super(`${resource}${detail} not found`, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

export class OwnershipError extends AppError {
  constructor(resource: string = 'resource') {
    super(`You do not own this ${resource}`, 403, 'OWNERSHIP_ERROR');
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxSizeMb: number) {
    super(`File size exceeds maximum limit of ${maxSizeMb} MB`, 400, 'FILE_TOO_LARGE');
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(allowedTypes: string[]) {
    super(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class AIServiceError extends AppError {
  constructor(message: string) {
    super(message, 503, 'AI_SERVICE_ERROR');
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 500, 'STORAGE_ERROR');
  }
}
