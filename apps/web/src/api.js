// AUTH-002 — fetch wrapper that injects the Firebase JWT on every API call.
import { getBearerToken, logout } from './auth.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await getBearerToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    await logout();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res;
}
