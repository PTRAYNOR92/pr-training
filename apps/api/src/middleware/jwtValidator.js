// API-002 / API-004 — Firebase RS256 JWT validation with cached JWKS.
// See SAD §2.2.2 for the verification steps.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/env.js';

const JWKS_URL = new URL(
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
);
// jose's createRemoteJWKSet caches keys per Cache-Control TTL — satisfies API-004.
const jwks = createRemoteJWKSet(
  new URL(`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`),
);

export async function jwtValidator(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${config.firebase.projectId}`,
      audience: config.firebase.projectId,
      algorithms: ['RS256'],
    });

    req.user = { uid: payload.sub, email: payload.email, claims: payload };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}
