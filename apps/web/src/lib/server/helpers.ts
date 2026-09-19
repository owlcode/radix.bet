import { ResultAsync } from 'neverthrow';
import { config } from '$lib/config';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { parse, type BaseSchema } from 'valibot';

export const isWellKnownPath = (event: RequestEvent) =>
  event.url.pathname === '/.well-known/radix.json';

export const getWellKnownResponse = () =>
  new Response(
    JSON.stringify({
      dApps: [
        {
          dAppDefinitionAddress: config.dAppDefinitionAddress
        }
      ]
    }),
    {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    }
  );

export enum DbErrorCode {
  Generic,
  NotFound,
  CreateChallengeFailed,
  UpsertUserFailed,
  DeleteChallengeFailed,
  SetLinkedAccountsFailed
}
export enum ApiErrorCode {
  Generic,
  Forbidden,
  AccountAddressUsed,
  ChallengeExpired,
  LoginFailed
}

export const createDbError = (code: DbErrorCode) => (err?: unknown) => {
  return { code, err };
};

export const createApiError = (code: ApiErrorCode) => (err?: unknown) => {
  return { httpResponseCode: 400, code, err };
};

export type ApiError = {
  httpResponseCode: number;
  code: string | number;
  err: unknown;
};

export const validateSchema = <TSchema extends BaseSchema>(
  schema: TSchema,
  req: { json: () => Promise<unknown> }
) =>
  ResultAsync.fromPromise(
    req.json().then((d) => parse(schema, d)),
    (e: unknown) => e
  );

export const handleApiResponse = async (
  fn: () => ResultAsync<
    { httpResponseCode?: number; data?: unknown; headers?: HeadersInit },
    { httpResponseCode: number }
  >
) => {
  const result = await fn();
  if (result.isOk()) {
    return json(result.value.data || {}, {
      status: result.value.httpResponseCode,
      headers: result.value.headers
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return error(result.error.httpResponseCode, result.error as any);
};
