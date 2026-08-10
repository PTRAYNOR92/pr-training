// API-007 — voice synthesis endpoint. Forwards to the configured voice provider.
// Factory pattern matches chat.js: provider is injected so tests can stub it
// and production can wire ElevenLabs (or a future alternative) via env.
import { Router } from 'express';

/**
 * @param {object} opts
 * @param {object} opts.voiceProvider — { name: string, synthesize: Function }
 */
export function createVoiceRouter({ voiceProvider } = {}) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const { text, voiceId } = req.body ?? {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'text (string) is required' });
      }

      const audio = await voiceProvider.synthesize({
        text,
        voiceId,
        userId: req.user.uid,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audio);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Default export — matches chat.js sentinel so an unconfigured mount fails loudly.
export default Router().post('/', (_req, res) => {
  res.status(501).json({ error: 'Voice route not configured — use createVoiceRouter()' });
});
