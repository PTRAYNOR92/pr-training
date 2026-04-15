// SAD §3.2 — IP-based rate limit (default 100 req/min).
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export function rateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: config.quotas.ipRatePerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });
}
