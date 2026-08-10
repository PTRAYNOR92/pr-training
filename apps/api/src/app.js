// Express app factory. Middleware ORDER MUST MATCH Solution Architecture §2.2.1.
// 1. CORS → 2. rate limit → 3. JWT → 4. quota → 5. request log → 6. handler → 7. response log
//
// Architecture note: the app is built in layers so each ticket (API-001..007)
// can be TDD'd independently. Public routes mount first; protected routes
// layer on middleware progressively.
import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';

/**
 * @param {object} opts
 * @param {Function} [opts.jwtValidator] — JWT middleware (API-002)
 * @param {Function} [opts.quotaChecker] — quota middleware (AI-005)
 * @param {Function} [opts.requestLogger] — request logger middleware
 * @param {Router[]} [opts.protectedRoutes] — array of { path, router } for protected endpoints
 */
export function createApp({ jwtValidator, quotaChecker, requestLogger, protectedRoutes = [] } = {}) {
  const app = express();

  // --- Layer 1: global middleware (always present) ---
  app.use(corsMiddleware());
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter());

  // --- Layer 2: public routes (no auth) ---
  app.use('/api/health', healthRoutes);

  // --- Layer 3: protected routes (added when middleware is provided) ---
  if (jwtValidator) {
    const pipeline = [jwtValidator];
    if (quotaChecker) pipeline.push(quotaChecker);
    if (requestLogger) pipeline.push(requestLogger);

    app.use('/api', ...pipeline);

    for (const { path, router } of protectedRoutes) {
      app.use(path, router);
    }
  }

  // --- Layer 4: error handling ---
  app.use(errorHandler);

  return app;
}
