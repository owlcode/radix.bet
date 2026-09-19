// See https://kit.svelte.dev/docs/types#app
import type { Rola } from '@radixdlt/rola';
import type { AuthModel } from '$lib/server/auth/auth.model';
import type { OAuth2 } from '$lib/server/auth/oauth2';
import type { UserModel } from '$lib/server/user/user.model';
import type { DbClient } from '$lib/server/db';
import type { Account } from '@radixdlt/radix-dapp-toolkit';

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      db: DbClient;
      rola: ReturnType<typeof Rola>;
      authModel: AuthModel;
      userModel: UserModel;
      oAuth2: OAuth2;
      user: {
        identityAddress: string;
        accounts: Account[];
      };
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
