// GET /api/me/usage — returns current user token usage vs quota.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ...req.quota, userId: req.user.uid });
});

export default router;
