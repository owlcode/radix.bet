/**
 * Sentry bootstrap. MUST be the first import of the entrypoint (index.ts) so
 * the SDK's instrumentation is installed before express/pg/ioredis load.
 *
 * No-ops when SENTRY_DSN is unset (local dev, tests).
 */
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

function tracesSampleRate(): number {
  const parsed = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '');
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.8;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // 80% of transactions traced (override with SENTRY_TRACES_SAMPLE_RATE).
    tracesSampleRate: tracesSampleRate(),
    dataCollection: {
      // NEVER send HTTP bodies. These carry Hookah webhook payloads with
      // their signatures, plus wallet data — credentials and financial
      // identifiers have no business leaving the box in a crash report.
      httpBodies: [],
      // End-user identity stays out regardless.
      userInfo: false
    }
  });
}
