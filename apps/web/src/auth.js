// AUTH-002 / AUTH-003 — auth state, token retrieval, logout-on-expiry redirect.
import { onAuthStateChanged, signOut, getIdToken } from 'firebase/auth';
import { auth } from './firebase.js';

let currentUser = null;

export function startAuthListener() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user && needsAuthForPath(window.location.pathname)) {
      window.location.replace('/login.html');
    }
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function getBearerToken() {
  if (!currentUser) return null;
  return getIdToken(currentUser, /* forceRefresh */ false);
}

export async function logout() {
  await signOut(auth);
  window.location.replace('/login.html');
}

function needsAuthForPath(pathname) {
  const publicPaths = ['/login.html', '/about.html', '/privacy.html'];
  return !publicPaths.includes(pathname);
}
