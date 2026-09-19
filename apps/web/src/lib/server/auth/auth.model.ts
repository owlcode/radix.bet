import { ResultAsync } from 'neverthrow';
import crypto from 'node:crypto';
import { DbClient } from '../db';
import { createDbError, DbErrorCode } from '../helpers';

export type AuthModel = ReturnType<typeof AuthModel>;
export const AuthModel = (dbClient = DbClient()) => {
  const secureRandom = (byteCount: number): string => crypto.randomBytes(byteCount).toString('hex');

  const createChallenge = () => {
    const challenge = secureRandom(32);

    return ResultAsync.fromPromise(
      dbClient.challenge.create({ data: { challenge } }),
      createDbError(DbErrorCode.CreateChallengeFailed)
    ).map((result: { challenge: string }) => result.challenge);
  };

  const getAndDelete = (challenge: string) => {
    const result = ResultAsync.fromPromise(
      dbClient.challenge.delete({ where: { challenge } }),
      createDbError(DbErrorCode.DeleteChallengeFailed)
    );

    return result;
  };

  return { createChallenge, getAndDelete };
};
