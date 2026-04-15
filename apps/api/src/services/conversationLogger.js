// Writes `conversations` + `messages` per the SDD §3.6 schema. Paired with incrementing usage_daily.
import { randomUUID } from 'node:crypto';
import { db } from './firestore.js';
import { incrementDailyUsage } from './quotaService.js';

export async function logConversation({
  conversationId,
  userId,
  prompt,
  response,
  tokensUsed,
  provider,
  model,
}) {
  const convId = conversationId || randomUUID();
  const now = new Date();

  const convRef = db.collection('conversations').doc(convId);
  await convRef.set(
    { userId, startedAt: now, title: prompt.slice(0, 80) },
    { merge: true },
  );

  const batch = db.batch();
  batch.set(db.collection('messages').doc(), {
    conversationId: convId,
    userId,
    timestamp: now,
    role: 'user',
    message: prompt,
    tokensUsed: 0,
    provider,
    model,
  });
  batch.set(db.collection('messages').doc(), {
    conversationId: convId,
    userId,
    timestamp: now,
    role: 'assistant',
    message: response,
    tokensUsed,
    provider,
    model,
  });
  await batch.commit();

  if (tokensUsed > 0) await incrementDailyUsage(userId, tokensUsed);
  return convId;
}
