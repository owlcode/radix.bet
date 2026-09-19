import { prisma } from '@radix-bet/database';

export async function updateEventStatus(
  eventId: string,
  status: 'PROCESSED' | 'FAILED',
  errorMessage?: string
): Promise<void> {
  await prisma.eventLog.update({
    where: { id: eventId },
    data: { status, errorMessage }
  });
}
