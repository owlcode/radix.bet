import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { config } from '$lib/config';
import type { Challenge } from '@radix-bet/database';
import type { SignedChallenge as SignedChallengeType } from '@radixdlt/radix-dapp-toolkit';
import { error, type RequestHandler } from '@sveltejs/kit';
import {
  ApiErrorCode,
  createApiError,
  handleApiResponse,
  type ApiError
} from '$lib/server/helpers';

const hasChallengeExpired = (challenge: Challenge): ResultAsync<Challenge, ApiError> => {
  const createdAt = challenge.createdAt.getTime();
  const expiresAt = createdAt + config.challenge.expiresInMs;
  const hasExpired = Date.now() > expiresAt;

  return hasExpired
    ? errAsync(createApiError(ApiErrorCode.ChallengeExpired)())
    : okAsync(challenge);
};

const isSignedChallengePayload = (value: unknown): value is SignedChallengeType => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.challenge === 'string' &&
    typeof payload.address === 'string' &&
    (payload.type === 'account' || payload.type === 'persona') &&
    !!payload.proof &&
    typeof payload.proof === 'object'
  );
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  const rawBody = await request.json().catch(() => null);
  const signedChallenges = Array.isArray(rawBody) ? rawBody : [rawBody];
  if (signedChallenges.length === 0 || !signedChallenges.every(isSignedChallengePayload)) {
    return error(400, 'Invalid signed challenge payloads');
  }

  const personaProof = signedChallenges.find((proof) => proof.type === 'persona');
  if (!personaProof) {
    return error(403, 'Persona proof is required');
  }

  return handleApiResponse(() =>
    ResultAsync.combine(
      [...new Set(signedChallenges.map((challenge) => challenge.challenge))].map((challenge) =>
        locals.authModel.getAndDelete(challenge).andThen(hasChallengeExpired)
      )
    )
      .andThen(() =>
        ResultAsync.combine(
          signedChallenges.map((challenge) =>
            ResultAsync.fromPromise(
              (async () => {
                const result = await locals.rola.verifySignedChallenge(challenge);
                if (result.isErr()) throw result.error;
                return result.value;
              })(),
              (e: unknown) => e
            )
          )
        )
      )
      .andThen(() => locals.userModel.upsert(personaProof.address))
      .andThen(() => {
        // Auto-link all ROLA-proved accounts on login
        const accountProofs = signedChallenges.filter((p) => p.type === 'account');
        if (accountProofs.length > 0) {
          return locals.userModel.linkAccounts(
            personaProof.address,
            accountProofs.map((p) => ({ address: p.address, label: '', appearanceId: 0 }))
          );
        }
        return okAsync(undefined);
      })
      .andThen(() => locals.oAuth2.createSessionToken(personaProof.address))
      .map((sessionToken: string) => ({
        data: {
          success: true
        },
        headers: locals.oAuth2.createSessionCookie(sessionToken, cookies),
        httpResponseCode: 200
      }))
      .mapErr((e: unknown) => createApiError(ApiErrorCode.LoginFailed)(e))
  );
};
