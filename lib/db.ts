/**
 * Database Service Module for MySQL Integration
 * 
 * Bu modül, Google Cloud SQL (MySQL) veritabanı ile etkileşimi yönetir.
 * Yalnızca sunucu tarafında çalışması için tasarlanmıştır (API rotaları, sunucu bileşenleri).
 * İstemci bileşenlerinde doğrudan kullanılmamalıdır.
 */

'use server'; // Bu modülün sunucu tarafında çalışacağını belirtiyoruz

import prisma from './prisma';

/**
 * Kullanıcı veri güncellemesi için tip tanımı
 */
type UserUpdateData = {
  name?: string;
  email?: string;
  password?: string;
  image?: string;
  emailVerified?: Date | null;
  role?: string;
};

/**
 * Kullanıcı oluşturma fonksiyonu
 * @param name Kullanıcı adı
 * @param email Kullanıcı email adresi 
 * @param hashedPassword Hashlenmiş şifre
 * @returns Oluşturulan kullanıcı
 */
export async function createUser(name: string, email: string, hashedPassword: string) {
  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Kullanıcı bilgilerini email ile getirme
 * @param email Kullanıcı email adresi
 * @returns Kullanıcı bilgileri veya null
 */
export async function getUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
}

/**
 * Kullanıcı bilgilerini ID ile getirme
 * @param id Kullanıcı ID'si
 * @returns Kullanıcı bilgileri veya null
 */
export async function getUserById(id: string) {
  try {
    return await prisma.user.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}

/**
 * Kullanıcı bilgilerini güncelleme
 * @param id Kullanıcı ID'si
 * @param data Güncellenecek veriler
 * @returns Güncellenmiş kullanıcı
 */
export async function updateUser(id: string, data: UserUpdateData) {
  try {
    return await prisma.user.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
} 