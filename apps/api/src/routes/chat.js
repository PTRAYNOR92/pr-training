// API-003 — chat completion endpoint. Forwards to the configured AI provider.
// Factory pattern: accepts a provider and optional logger for testability.
import { Router } from 'express';

/**
 * @param {object} opts
 * @param {object} opts.provider — { name: string, complete: Function }
 * @param {Function} [opts.logConversation] — optional conversation logger
 */
export function createChatRouter({ provider, logConversation } = {}) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const { prompt, conversationId } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'prompt (string) is required' });
      }

      const result = await provider.complete({ prompt, userId: req.user.uid });

      if (logConversation) {
        await logConversation({
          conversationId,
          userId: req.user.uid,
          prompt,
          response: result.text,
          tokensUsed: result.tokensUsed,
          provider: provider.name,
          model: result.model,
        });
      }

      res.json({
        text: result.text,
        tokensUsed: result.tokensUsed,
        model: result.model,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Default export for backward compatibility (requires provider at runtime).
export default Router().post('/', (_req, res) => {
  res.status(501).json({ error: 'Chat route not configured — use createChatRouter()' });
});
