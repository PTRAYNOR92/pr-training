// Uniform JSON error response. Never leak stack traces outside development.
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  logger.error({ err, url: req.url }, 'Request failed');
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || 'Internal Server Error',
    ...(config.nodeEnv === 'development' ? { detail: err.message } : {}),
  });
}
