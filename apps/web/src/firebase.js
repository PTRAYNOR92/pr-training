// AUTH-001 — Centralised Firebase initialisation. Import this module only; never call initializeApp() elsewhere.
// AUTH-005 — opt-in to the local emulator suite via VITE_FIREBASE_USE_EMULATOR=true.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  const host = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
  connectAuthEmulator(auth, host, { disableWarnings: true });
}
