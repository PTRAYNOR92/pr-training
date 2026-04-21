// AUTH-001 — single entry point for the compat Firebase SDK.
//
// The modular SDK is initialised in firebase.js (used by src/*.js modules).
// Legacy HTML pages still rely on window.firebase.* from the CDN compat
// scripts; this module does the one-time init and exposes window.auth,
// window.googleProvider, and (when firestore-compat is loaded) window.db
// so page-specific inline scripts can stop duplicating the config.
//
// Loaded as <script type="module">, which defers until after parsing — page
// scripts that depend on the globals must also be modules or use `defer`.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!window.firebase) {
  throw new Error(
    'firebase-compat CDN scripts must load before firebase-compat-init.js',
  );
}

if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

window.auth = window.firebase.auth();
if (window.firebase.firestore) {
  window.db = window.firebase.firestore();
}
if (window.firebase.auth.GoogleAuthProvider) {
  window.googleProvider = new window.firebase.auth.GoogleAuthProvider();
}

// AUTH-005 — opt-in to the local emulator suite via VITE_FIREBASE_USE_EMULATOR=true.
if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  const authHost =
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
  window.auth.useEmulator(authHost, { disableWarnings: true });
  if (window.db && window.db.useEmulator) {
    const [fsHost, fsPort] = (
      import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    ).split(':');
    window.db.useEmulator(fsHost, Number(fsPort));
  }
}
