import crypto from 'crypto';
import { config } from '../config/index.js';

export function validateWebhookSignature(payload: string, signature: string | undefined): boolean {
  // If no secret configured, reject all webhooks (fail-closed)
  if (!config.HOOKAH_WEBHOOK_SECRET) {
    return false;
  }

  if (!signature) {
    return false;
  }

  // Hookah sends the secret directly as the header value (not HMAC)
  // Use constant-time comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature);
    const secretBuf = Buffer.from(config.HOOKAH_WEBHOOK_SECRET);
    if (sigBuf.length === secretBuf.length && crypto.timingSafeEqual(sigBuf, secretBuf)) {
      return true;
    }
  } catch {
    // Length mismatch or encoding error — fall through to HMAC check
  }

  // Fall back to HMAC-SHA256 validation (existing behavior)
  const expectedSignature = crypto
    .createHmac('sha256', config.HOOKAH_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Prefix with algorithm if present in signature
  const signatureToCompare = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureToCompare, 'hex')
    );
  } catch {
    return false;
  }
}

export function generateWebhookSignature(payload: string): string {
  if (!config.HOOKAH_WEBHOOK_SECRET) {
    return '';
  }

  return `sha256=${crypto
    .createHmac('sha256', config.HOOKAH_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;
}
