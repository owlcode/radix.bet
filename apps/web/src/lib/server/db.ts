// Re-export from the shared database package
import { PrismaClient, prisma } from '@radix-bet/database';

export type DbClient = PrismaClient;
export const DbClient = () => prisma;
