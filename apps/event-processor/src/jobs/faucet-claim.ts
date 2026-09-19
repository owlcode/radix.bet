import {
  deriveAccount,
  fundFromFaucet,
  getXrdBalance,
} from '@radix-bet/radix';
import { isStokenet } from '@radix-bet/config';
import { ALL_ORACLES } from '../oracle/configs.js';
import { logger } from '../utils/logger.js';

const MIN_XRD_BALANCE = 200;

export async function processFaucetClaim(): Promise<void> {
  if (!isStokenet()) {
    logger.info('[FaucetClaim] Not on Stokenet, skipping');
    return;
  }

  for (const oracle of ALL_ORACLES) {
    const privateKey = process.env[oracle.privateKeyEnvVar];
    if (!privateKey) continue;

    try {
      const { account } = await deriveAccount(privateKey);
      const balance = await getXrdBalance(account.address);

      if (balance < MIN_XRD_BALANCE) {
        logger.info(`[FaucetClaim] ${oracle.displayName} balance low (${balance} XRD), claiming from faucet...`);
        await fundFromFaucet(account.address);
        const newBalance = await getXrdBalance(account.address);
        logger.info(`[FaucetClaim] ${oracle.displayName} funded: ${balance} → ${newBalance} XRD`);
      } else {
        logger.info(`[FaucetClaim] ${oracle.displayName} balance OK (${balance} XRD)`);
      }
    } catch (err) {
      logger.error(`[FaucetClaim] Failed for ${oracle.displayName}:`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Also fund seeder account if configured
  const seederKey = process.env.SEEDER_PRIVATE_KEY;
  if (seederKey) {
    try {
      const { account } = await deriveAccount(seederKey);
      const balance = await getXrdBalance(account.address);
      if (balance < MIN_XRD_BALANCE) {
        logger.info(`[FaucetClaim] Seeder balance low (${balance} XRD), claiming...`);
        await fundFromFaucet(account.address);
        logger.info('[FaucetClaim] Seeder funded');
      }
    } catch (err) {
      logger.error('[FaucetClaim] Failed for seeder:', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
