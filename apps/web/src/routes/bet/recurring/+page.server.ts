import { prisma } from '@radix-bet/database';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user?.identityAddress) {
    throw error(401, 'Not authenticated');
  }

  const templates = await prisma.recurringBetTemplate.findMany({
    where: {
      userIdentityAddress: locals.user?.identityAddress
    },
    include: {
      betsCreated: {
        select: {
          componentAddress: true,
          name: true,
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      categoryId: t.categoryId,
      currency: t.currency,
      scheduleType: t.scheduleType,
      scheduleDay: t.scheduleDay,
      scheduleTime: t.scheduleTime,
      isActive: t.isActive,
      nextRunAt: t.nextRunAt?.toISOString() ?? null,
      lastRunAt: t.lastRunAt?.toISOString() ?? null,
      runCount: t.runCount,
      maxRuns: t.maxRuns,
      betsCreated: t.betsCreated.map((b) => ({
        componentAddress: b.componentAddress,
        name: b.name,
        createdAt: b.createdAt.toISOString(),
        status: b.status
      }))
    }))
  };
};
