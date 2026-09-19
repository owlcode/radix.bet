import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ url }) => {
  const componentAddress = url.searchParams.get('bet');
  if (!componentAddress) {
    throw error(400, 'Missing bet parameter');
  }

  const comments = await prisma.comment.findMany({
    where: { componentAddress },
    include: {
      user: {
        include: {
          userAccounts: {
            take: 1,
            include: { account: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: {
        identityAddress: c.userIdentityAddress,
        displayAddress: c.user.userAccounts[0]?.account?.address || c.userIdentityAddress,
        displayLabel: c.user.userAccounts[0]?.account?.label || undefined
      }
    }))
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Must be logged in to comment');
  }

  const body = await request.json();
  const { componentAddress, content } = body;

  if (!componentAddress || !content?.trim()) {
    throw error(400, 'Missing componentAddress or content');
  }

  if (content.length > 1000) {
    throw error(400, 'Comment too long (max 1000 characters)');
  }

  // Verify bet exists
  const bet = await prisma.bet.findUnique({
    where: { componentAddress }
  });
  if (!bet) {
    throw error(404, 'Bet not found');
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      componentAddress,
      userIdentityAddress: locals.user.identityAddress
    }
  });

  return json({ comment: { id: comment.id, createdAt: comment.createdAt } }, { status: 201 });
};
