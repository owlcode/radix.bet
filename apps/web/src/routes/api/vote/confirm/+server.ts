import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(403);

  const { voteIntentId, transactionId } = await request.json();

  if (!voteIntentId || !transactionId) {
    throw error(400, 'voteIntentId and transactionId are required');
  }

  // Verify the VoteIntent belongs to this user
  const intent = await prisma.voteIntent.findUnique({
    where: { id: voteIntentId }
  });

  if (!intent || intent.identityAddress !== locals.user.identityAddress) {
    throw error(404, 'VoteIntent not found');
  }

  if (intent.transactionId) {
    // Already confirmed — idempotent
    return json({ success: true });
  }

  // Set transactionId on VoteIntent
  await prisma.voteIntent.update({
    where: { id: voteIntentId },
    data: { transactionId }
  });

  // Check if the Vote record already exists (webhook arrived first)
  const existingVote = await prisma.vote.findUnique({
    where: { transactionId }
  });

  if (existingVote && !existingVote.voteIntentId) {
    // Link them — catch unique constraint violation (concurrent match)
    try {
      await prisma.$transaction([
        prisma.vote.update({
          where: { transactionId },
          data: { voteIntentId }
        }),
        prisma.voteIntent.update({
          where: { id: voteIntentId },
          data: { matched: true }
        })
      ]);
    } catch {
      // Unique constraint violation = other side already linked, success
    }
  }

  return json({ success: true });
};
