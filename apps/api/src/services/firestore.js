// Firestore admin client singleton.
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config/env.js';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: config.firebase.projectId,
  });
}

export const db = getFirestore();
