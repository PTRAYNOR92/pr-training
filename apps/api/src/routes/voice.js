// API-007 — voice synthesis endpoint. Forwards to ElevenLabs.
import { Router } from 'express';
import { synthesize } from '../providers/elevenLabs.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { text, voiceId } = req.body ?? {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) is required' });
    }
    const audio = await synthesize({ text, voiceId });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    next(err);
  }
});

export default router;
