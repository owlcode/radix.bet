import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });

// Leaving this undefined is fine for `prisma generate` (CI postinstall
// without env). Prisma throws at runtime if a connection is actually used.
const url = process.env['RADIXBET_DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url
  }
});
