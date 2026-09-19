import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async () => {
  const categories = await prisma.category.findMany({
    orderBy: { slug: 'asc' }
  });
  return json({ categories });
};
