// API-006 — CORS allowlist restricted to the production frontend domain.
import cors from 'cors';
import { config } from '../config/env.js';

export function corsMiddleware() {
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (config.cors.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
