// DB-003 — read path for chat history. Returns the most recent N messages for
// a user, newest-first. The frontend reverses for chronological rendering.
import { db } from './firestore.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export async function listRecentMessages(userId, limit) {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;

  const snapshot = await db
    .collection('messages')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      conversationId: data.conversationId,
      role: data.role,
      message: data.message,
      tokensUsed: data.tokensUsed,
      provider: data.provider,
      model: data.model,
      timestamp: data.timestamp.toDate().toISOString(),
    };
  });
}
