import { config, networkId } from '$lib/config';
import { AuthModel } from '$lib/server/auth/auth.model';
import { OAuth2 } from '$lib/server/auth/oauth2';
import { DbClient } from '$lib/server/db';
import { getWellKnownResponse, isWellKnownPath } from '$lib/server/helpers';
import { UserModel } from '$lib/server/user/user.model';
import type { Account } from '@radixdlt/radix-dapp-toolkit';
import { Rola } from '@radixdlt/rola';
import type { Handle } from '@sveltejs/kit';
import { prepareStylesSSR } from '@svelteuidev/core';

export const handle: Handle = async ({ event, resolve }) => {
  if (isWellKnownPath(event)) {
    return getWellKnownResponse();
  }

  event.locals.db = DbClient();
  event.locals.oAuth2 = OAuth2({});
  event.locals.authModel = AuthModel(event.locals.db);
  event.locals.userModel = UserModel(event.locals.db);
  event.locals.rola = Rola({
    applicationName: config.applicationName,
    dAppDefinitionAddress: config.dAppDefinitionAddress,
    networkId,
    expectedOrigin: process.env.ORIGIN || 'http://localhost:5173'
  });
  // event.locals.gateway = gatewayFn({ fetchFn: fetch });

  const sessionToken = event.cookies.get('jwt');
  let rotatedSessionCookieHeader: string | null = null;
  let clearSessionCookieHeader: string | null = null;

  if (sessionToken) {
    const verifiedIdentity = event.locals.oAuth2.verifyToken(sessionToken);

    if (verifiedIdentity.isOk()) {
      const result = await event.locals.userModel.get(verifiedIdentity.value);

      if (result.isOk()) {
        event.locals.user = {
          identityAddress: result.value.identityAddress,
          accounts: result.value.userAccounts.map((ua) => ua.account) as Account[]
        };

        if (event.locals.oAuth2.shouldRotate(sessionToken)) {
          const rotated = event.locals.oAuth2.rotateSessionCookie(event.cookies);
          if (rotated.isOk()) {
            rotatedSessionCookieHeader = rotated.value['Set-Cookie'];
          }
        }
      }
    } else {
      clearSessionCookieHeader = event.locals.oAuth2.clearSessionCookie(event.cookies)['Set-Cookie'];
    }
  }

  const response = await prepareStylesSSR({ event, resolve });

  if (!response.headers.has('set-cookie')) {
    if (clearSessionCookieHeader) {
      response.headers.set('set-cookie', clearSessionCookieHeader);
    } else if (rotatedSessionCookieHeader) {
      response.headers.set('set-cookie', rotatedSessionCookieHeader);
    }
  }

  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('cache-control', 'no-cache');
  }

  return response;
};
