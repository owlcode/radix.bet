import { err, ok, ResultAsync } from 'neverthrow';
import { DbClient } from '../db';
import { createDbError, DbErrorCode } from '../helpers';
import type { Account } from '@radixdlt/radix-dapp-toolkit';

export type UserModel = ReturnType<typeof UserModel>;
export const UserModel = (dbClient = DbClient()) => {
  const userInclude = {
    userAccounts: {
      include: { account: true }
    }
  };

  const upsert = (identityAddress: string) =>
    ResultAsync.fromPromise(
      dbClient.user.upsert({
        where: { identityAddress },
        create: { identityAddress },
        update: {},
        include: userInclude
      }),
      (e: unknown) => createDbError(DbErrorCode.UpsertUserFailed)(e)
    );

  const get = (identityAddress: string) =>
    ResultAsync.fromPromise(
      dbClient.user.findUnique({
        where: { identityAddress },
        include: userInclude
      }),
      (e: unknown) => createDbError(DbErrorCode.Generic)(e)
    ).andThen((res) => (res ? ok(res) : err(createDbError(DbErrorCode.NotFound)())));

  const linkAccounts = (identityAddress: string, accounts: Account[]) =>
    ResultAsync.fromPromise(
      dbClient.$transaction(
        accounts.map((acc) =>
          dbClient.account.upsert({
            where: { address: acc.address },
            create: {
              address: acc.address,
              label: acc.label ?? null,
              appearanceId: acc.appearanceId ?? null
            },
            update: {
              label: acc.label ?? undefined,
              appearanceId: acc.appearanceId ?? undefined
            }
          })
        )
      ).then(() =>
        dbClient.$transaction(
          accounts.map((acc) =>
            dbClient.userAccount.upsert({
              where: {
                identityAddress_accountAddress: {
                  identityAddress,
                  accountAddress: acc.address
                }
              },
              create: {
                identityAddress,
                accountAddress: acc.address
              },
              update: {}
            })
          )
        )
      ),
      (e: unknown) => createDbError(DbErrorCode.SetLinkedAccountsFailed)(e)
    );

  return { get, upsert, linkAccounts };
};
