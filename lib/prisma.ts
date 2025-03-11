/**
 * Prisma Client Singleton
 * 
 * Bu modül, Prisma istemcisinin tek bir örneğini (singleton) oluşturur ve yönetir.
 * Next.js'nin development modunda gereksiz bağlantıların oluşmasını önlemek için
 * global bir değişken kullanarak istemci örneğini saklar.
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient için global namespace bildirimi
declare global {
  var prisma: PrismaClient | undefined;
}

// Prisma Client örneği
// Development modunda hot-reloading sırasında birden fazla bağlantı açılmasını önlemek için
// global değişkeni kullanarak tek bir örnek oluşturulur
export const prisma = global.prisma || new PrismaClient();

// Development modunda global değişkene atama
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 