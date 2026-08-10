// API-002 / API-004 — Firebase RS256 JWT validation with cached JWKS.
// See SAD §2.2.2 for the verification steps.
//
// Exported as a factory so tests can inject a local JWKS (no network calls).
// Production wiring passes createRemoteJWKSet(googleUrl) via createJwtValidator().
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/env.js';

const GOOGLE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
);

/**
 * Factory: creates a JWT validation middleware.
 * @param {object} opts
 * @param {Function} opts.jwks — jose key resolver (remote or local)
 * @param {string} opts.projectId — Firebase project ID
 */
export function createJwtValidatorMiddleware({ jwks, projectId } = {}) {
  const resolvedJwks = jwks ?? createRemoteJWKSet(GOOGLE_JWKS_URL);
  const resolvedProjectId = projectId ?? config.firebase.projectId;

  return async function jwtValidator(req, res, next) {
    try {
      const header = req.get('authorization') || '';
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing bearer token' });
      }

      const { payload } = await jwtVerify(token, resolvedJwks, {
        issuer: `https://securetoken.google.com/${resolvedProjectId}`,
        audience: resolvedProjectId,
        algorithms: ['RS256'],
      });

      req.user = { uid: payload.sub, email: payload.email, claims: payload };
      next();
    } catch (_err) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Default instance for production use (created lazily on first import in index.js).
export const jwtValidator = createJwtValidatorMiddleware();
