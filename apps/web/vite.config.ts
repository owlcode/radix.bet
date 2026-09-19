import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Prisma 7 generates CJS with browser/node conditional exports, and Vite
 * resolves the browser entry (`index-browser.js`) for SSR — which has no
 * PrismaClient on it, so every server module that touches the database dies
 * with "exports is not defined".
 *
 * This swaps that import for a small virtual ESM module that `createRequire`s
 * the Node CJS entry instead. The path is resolved here, while the config is
 * being loaded and real filesystem context still exists; a virtual module has
 * no `import.meta.url` of its own to resolve against.
 */
function prismaCompatPlugin(): Plugin {
  const VIRTUAL_ID = '\0prisma-client-virtual';
  const clientEntry = fileURLToPath(
    new URL('../../packages/database/generated/prisma/index.js', import.meta.url)
  );

  return {
    name: 'prisma-compat',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      // The database package's own `import { PrismaClient } from '../generated/prisma'`.
      if (importer.includes('packages/database') && source === '../generated/prisma') {
        return VIRTUAL_ID;
      }
      return null;
    },
    load(id) {
      if (id !== VIRTUAL_ID) return null;
      return `
        import { createRequire } from 'node:module';
        const require = createRequire(${JSON.stringify(import.meta.url)});
        const prismaModule = require(${JSON.stringify(clientEntry)});
        export const PrismaClient = prismaModule.PrismaClient;
        export const Prisma = prismaModule.Prisma;
        export default prismaModule;
      `;
    }
  };
}

export default defineConfig({
  plugins: [prismaCompatPlugin(), sveltekit(), devtoolsJson()],
  assetsInclude: ['**/*.md'],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },
  ssr: {
    noExternal: ['@radix-bet/database']
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
