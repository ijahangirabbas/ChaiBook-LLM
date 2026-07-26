import { PrismaClient } from '@prisma/client';

const isTest = process.env.NODE_ENV === 'test' || process.env.SILENT_PRISMA === 'true';

export const prisma = new PrismaClient({
  log: isTest ? [] : process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
