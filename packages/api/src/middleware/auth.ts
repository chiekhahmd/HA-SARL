/**
 * Auth Middleware — verifies Cognito JWT and extracts user claims.
 *
 * Sets in context:
 * - userId (Cognito sub)
 * - userEmail
 * - userRole (admin | manager | worker)
 * - tenantId (from custom:tenant_id claim)
 *
 * Skips verification for public routes (e.g. /health).
 */
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';

// Extend Hono's context variables
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    userRole: 'admin' | 'manager' | 'worker';
    tenantId: string;
  }
}

export type UserRole = 'admin' | 'manager' | 'worker';

// JWKS cache (jose handles caching internally)
let jwks: jose.JWTVerifyGetKey | null = null;

function getJwks(): jose.JWTVerifyGetKey {
  if (jwks) return jwks;

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.COGNITO_REGION || 'eu-west-3';

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwksUrl = `${issuer}/.well-known/jwks.json`;

  jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
  return jwks;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/health', '/'];

export const authMiddleware = () => {
  return createMiddleware(async (c, next) => {
    // Skip auth for public routes
    if (PUBLIC_ROUTES.includes(c.req.path)) {
      await next();
      return;
    }

    // Extract Bearer token
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    try {
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      const region = process.env.COGNITO_REGION || 'eu-west-3';
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

      // Verify JWT signature and claims
      const { payload } = await jose.jwtVerify(token, getJwks(), {
        issuer,
        algorithms: ['RS256'],
      });

      // Extract claims
      const sub = payload.sub;
      const email = (payload.email as string) || '';
      const role = (payload['custom:role'] as UserRole) || 'worker';
      const tenantId = (payload['custom:tenant_id'] as string) || '';

      if (!sub) {
        throw new HTTPException(401, { message: 'Invalid token: missing sub claim' });
      }

      if (!tenantId) {
        throw new HTTPException(401, { message: 'Invalid token: missing tenant_id claim' });
      }

      if (!['admin', 'manager', 'worker'].includes(role)) {
        throw new HTTPException(401, { message: 'Invalid token: invalid role claim' });
      }

      // Set context variables for downstream handlers
      c.set('userId', sub);
      c.set('userEmail', email);
      c.set('userRole', role);
      c.set('tenantId', tenantId);

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      if (error instanceof jose.errors.JWTExpired) {
        throw new HTTPException(401, { message: 'Token expired' });
      }
      if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
        throw new HTTPException(401, { message: 'Invalid token signature' });
      }
      throw new HTTPException(401, { message: 'Authentication failed' });
    }
  });
};

/**
 * Role-based authorization helper.
 * Use as route-level middleware: authorize('admin', 'manager')
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return createMiddleware(async (c, next) => {
    const role = c.get('userRole');

    if (!role || !allowedRoles.includes(role)) {
      throw new HTTPException(403, {
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    await next();
  });
};
