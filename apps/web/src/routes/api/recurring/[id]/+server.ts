import { prisma } from '@radix-bet/database';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user?.identityAddress) {
    throw error(401, 'Not authenticated');
  }

  const { id } = params;
  const body = await request.json();

  // Verify ownership
  const template = await prisma.recurringBetTemplate.findUnique({
    where: { id }
  });

  if (!template) {
    throw error(404, 'Template not found');
  }

  if (template.userIdentityAddress !== locals.user?.identityAddress) {
    throw error(403, 'Not authorized to modify this template');
  }

  // Update allowed fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (typeof body.isActive === 'boolean') {
    updateData.isActive = body.isActive;

    // If re-activating, recalculate next run time
    if (body.isActive && !template.isActive) {
      updateData.nextRunAt = calculateNextRunAt(
        template.scheduleType,
        template.scheduleDay,
        template.scheduleTime
      );
    }
  }

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.description !== undefined) {
    updateData.description = body.description;
  }

  const updated = await prisma.recurringBetTemplate.update({
    where: { id },
    data: updateData
  });

  return json({ success: true, template: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user?.identityAddress) {
    throw error(401, 'Not authenticated');
  }

  const { id } = params;

  // Verify ownership
  const template = await prisma.recurringBetTemplate.findUnique({
    where: { id }
  });

  if (!template) {
    throw error(404, 'Template not found');
  }

  if (template.userIdentityAddress !== locals.user?.identityAddress) {
    throw error(403, 'Not authorized to delete this template');
  }

  // First, unlink any bets created from this template
  await prisma.bet.updateMany({
    where: { recurringTemplateId: id },
    data: { recurringTemplateId: null }
  });

  // Delete the template
  await prisma.recurringBetTemplate.delete({
    where: { id }
  });

  return json({ success: true });
};

function calculateNextRunAt(
  scheduleType: string,
  scheduleDay: number | null,
  scheduleTime: string
): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const now = new Date();
  const next = new Date();

  next.setUTCHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (scheduleType) {
    case 'DAILY':
      break;

    case 'WEEKLY': {
      const currentDay = next.getUTCDay();
      const targetDay = scheduleDay ?? 0;
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case 'MONTHLY': {
      const targetDate = scheduleDay ?? 1;
      next.setUTCDate(targetDate);
      if (next <= now) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      break;
    }
  }

  return next;
}
