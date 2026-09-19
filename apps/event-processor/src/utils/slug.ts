import crypto from 'crypto';

/**
 * Generate a URL-friendly slug from a bet name with a short unique suffix.
 * Example: "Lakers vs Celtics" → "lakers-vs-celtics-a3f2b1"
 */
export function generateBetSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const shortId = crypto.randomBytes(3).toString('hex');
  return `${base}-${shortId}`;
}
