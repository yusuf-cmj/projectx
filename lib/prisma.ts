/**
 * Prisma Client Singleton
 * 
 * Bu modül, Prisma istemcisinin tek bir örneğini (singleton) oluşturur ve yönetir.
 * Next.js'nin development modunda gereksiz bağlantıların oluşmasını önlemek için
 * global bir değişken kullanarak istemci örneğini saklar.
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient örneği
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// Prisma Client örneği
// Development modunda hot-reloading sırasında birden fazla bağlantı açılmasını önlemek için
// global değişkeni kullanarak tek bir örnek oluşturulur
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Development modunda global değişkene atama
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma; 