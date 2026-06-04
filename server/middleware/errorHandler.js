import { sanitizeError } from '../utils/safeError.js';

export default function errorHandler(err, req, res, next) {
  // Safe logging on the server console (no API keys or raw authorization headers)
  const logInfo = {
    message: err.message,
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  // Log error without leaking sensitive environments or stack traces to client
  console.error('[SERVER_ERROR]', JSON.stringify(logInfo), err.stack);

  const { statusCode, message } = sanitizeError(err);
  res.status(statusCode).json({ error: message });
}
