// AI-005 — per-user daily token quota, stored in Firestore `usage_daily` collection.
// Placeholder: wires into quotaService (to be implemented against Firestore admin SDK).
import { config } from '../config/env.js';
import { getDailyUsage } from '../services/quotaService.js';

export async function quotaChecker(req, res, next) {
  try {
    const used = await getDailyUsage(req.user.uid);
    if (used >= config.quotas.dailyTokensPerUser) {
      return res.status(429).json({
        error: 'Daily token quota exceeded',
        used,
        limit: config.quotas.dailyTokensPerUser,
      });
    }
    req.quota = { used, limit: config.quotas.dailyTokensPerUser };
    next();
  } catch (err) {
    next(err);
  }
}
