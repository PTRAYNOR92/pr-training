// Express app factory. Middleware ORDER MUST MATCH Solution Architecture §2.2.1.
// 1. CORS → 2. rate limit → 3. JWT → 4. quota → 5. request log → 6. handler → 7. response log
import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { jwtValidator } from './middleware/jwtValidator.js';
import { quotaChecker } from './middleware/quotaChecker.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import chatRoutes from './routes/chat.js';
import voiceRoutes from './routes/voice.js';
import usageRoutes from './routes/usage.js';

export function createApp() {
  const app = express();

  app.use(corsMiddleware());
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter());

  // Public — no auth required.
  app.use('/api/health', healthRoutes);

  // Protected — JWT + quota pipeline.
  app.use('/api', jwtValidator, quotaChecker, requestLogger);
  app.use('/api/chat', chatRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/me/usage', usageRoutes);

  app.use(errorHandler);
  return app;
}
