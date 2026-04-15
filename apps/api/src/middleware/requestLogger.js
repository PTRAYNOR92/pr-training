// SAD §2.2.1 — request/response logging. Uses pino-http for structured JSON logs.
import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

export const requestLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    userId: req.user?.uid ?? null,
  }),
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ status: res.statusCode }),
  },
});
