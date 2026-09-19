import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Result, err, ok } from 'neverthrow';
import type { Cookies } from '@sveltejs/kit';

export type OAuth2Input = {
  sessionToken: { expiresIn: string; key: string };
  rotationThresholdSeconds: number;
  secret: string;
};

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return secret || 'secret';
})();

export type OAuth2 = ReturnType<typeof OAuth2>;
export const OAuth2 = (input?: Partial<OAuth2Input>) => {
  const { secret, sessionToken, rotationThresholdSeconds }: OAuth2Input = {
    secret: JWT_SECRET,
    sessionToken: { expiresIn: '180d', key: 'jwt' },
    rotationThresholdSeconds: 60 * 60 * 24 * 7,
    ...(input || {})
  };

  const createSessionToken = (identityAddress: string) =>
    ok(
      jwt.sign({ identityAddress }, secret, {
        expiresIn: sessionToken.expiresIn as jwt.SignOptions['expiresIn']
      })
    );

  const getSessionTokenFromCookies = (
    cookies: Cookies
  ): Result<string, { reason: string; jsError?: Error }> => {
    const token = cookies.get(sessionToken.key);
    return token ? ok(token) : err({ reason: 'invalidSessionToken' });
  };

  const verifyToken = (token: string): Result<string, { reason: string; jsError?: unknown }> => {
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return ok(typeof decoded === 'string' ? decoded : decoded.identityAddress);
    } catch (error) {
      return err({ jsError: error, reason: 'invalidToken' });
    }
  };

  const createSessionCookie = (token: string, cookies: Cookies) => ({
    'Set-Cookie': cookies.serialize(sessionToken.key, token, createSessionTokenOptions())
  });

  const clearSessionCookie = (cookies: Cookies) => ({
    'Set-Cookie': cookies.serialize(sessionToken.key, '', {
      ...createSessionTokenOptions(),
      maxAge: 0
    })
  });

  const shouldRotate = (token: string) => {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded?.iat) {
      return true;
    }

    const issuedAtSeconds = decoded.iat;
    const tokenAgeSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;
    return tokenAgeSeconds >= rotationThresholdSeconds;
  };

  const rotateSessionCookie = (
    cookies: Cookies
  ): Result<{ ['Set-Cookie']: string }, { jsError?: unknown; reason: string }> =>
    getSessionTokenFromCookies(cookies)
      .andThen(verifyToken)
      .andThen(createSessionToken)
      .map((jwtToken: string) => createSessionCookie(jwtToken, cookies));

  const createSessionTokenOptions = (): Parameters<Cookies['serialize']>[2] => {
    return {
      httpOnly: true,
      maxAge: 15_552_000, // 180 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    };
  };

  return {
    createSessionToken,
    createSessionCookie,
    clearSessionCookie,
    rotateSessionCookie,
    shouldRotate,
    verifyToken
  };
};
