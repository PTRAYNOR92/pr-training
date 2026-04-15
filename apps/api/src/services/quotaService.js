// AI-005 — reads/writes the `usage_daily` collection keyed by UID + YYYY-MM-DD.
import { db } from './firestore.js';

function todayKey(uid) {
  const iso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `${uid}_${iso}`;
}

export async function getDailyUsage(uid) {
  const doc = await db.collection('usage_daily').doc(todayKey(uid)).get();
  return doc.exists ? (doc.data().tokens ?? 0) : 0;
}

export async function incrementDailyUsage(uid, tokens) {
  const ref = db.collection('usage_daily').doc(todayKey(uid));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data().tokens ?? 0) : 0;
    tx.set(ref, { uid, tokens: current + tokens, updatedAt: new Date() }, { merge: true });
  });
}
