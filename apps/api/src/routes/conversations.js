// DB-003 — chat history endpoints. Strictly scoped to req.user.uid; query
// params can refine pagination but never widen the user scope (the JWT is
// the authoritative identity, see API-002).
import { Router } from 'express';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * @param {object} opts
 * @param {Function} opts.listRecentMessages — (uid, limit) => Promise<Message[]>
 */
export function createConversationsRouter({ listRecentMessages } = {}) {
  const router = Router();

  router.get('/recent', async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit);
      if (limit === null) {
        return res.status(400).json({ error: 'limit must be a positive integer' });
      }

      const messages = await listRecentMessages(req.user.uid, limit);
      res.json({ messages });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function parseLimit(raw) {
  if (raw === undefined) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return Math.min(n, MAX_LIMIT);
}
