// API-003 — chat completion endpoint. Forwards to the configured AI provider.
import { Router } from 'express';
import { getAIProvider } from '../providers/index.js';
import { logConversation } from '../services/conversationLogger.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { prompt, conversationId } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt (string) is required' });
    }

    const provider = getAIProvider();
    const result = await provider.complete({ prompt, userId: req.user.uid });

    await logConversation({
      conversationId,
      userId: req.user.uid,
      prompt,
      response: result.text,
      tokensUsed: result.tokensUsed,
      provider: provider.name,
      model: result.model,
    });

    res.json({
      text: result.text,
      tokensUsed: result.tokensUsed,
      model: result.model,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
