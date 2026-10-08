import { config } from './config.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`), { cooldownDuration: 30_000 });

export async function identifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: `${config.supabaseUrl}/auth/v1`, audience: 'authenticated' });
    if (payload.sub) return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
  } catch {
    // Local Supabase defaults may use a symmetric JWT secret and have no public JWKS.
    // Fall back to Auth's user endpoint in that development mode.
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { id: user.id, email: user.email || null } : null;
}

export async function requireUser(req, res, next) {
  try {
    const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = await identifyToken(token);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
