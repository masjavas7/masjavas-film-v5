export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sanitizes errors to prevent exposing raw provider/system error logs to the frontend
 * @param {Error} error The caught error object
 * @returns {object} { statusCode, message }
 */
export function sanitizeError(error) {
  // If it's our own AppError, we can send its message
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message
    };
  }

  // Handle other known types or defaults
  // Do NOT leak raw database, request headers, API keys, or system errors
  return {
    statusCode: 500,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.'
  };
}
