import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const roleUpdateSchema = z.object({
  role: z.enum(['admin', 'user']),
});

export async function PUT(
    request: Request,
    // context: { params: { id: string } } // Removed unused context parameter
): Promise<NextResponse> {

  // Extract ID from URL instead of context.params
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const targetUserId = pathSegments[pathSegments.length - 1]; // Get the last segment which should be the ID

  if (!targetUserId) {
      return NextResponse.json({ error: 'Could not extract user ID from URL.' }, { status: 400 });
  }

  // 1. Yetkilendirme Kontrolü (Admin mi?)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Kendini Değiştirmeyi Engelle
  if (session.user.id === targetUserId) {
      return NextResponse.json({ error: 'Admins cannot change their own role.' }, { status: 403 });
  }

  try {
    // 3. İstek Body'sini Ayrıştır ve Doğrula
    const body = await request.json();
    const validation = roleUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { role: newRole } = validation.data;

    // 4. Kullanıcıyı Bul ve Güncelle
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: newRole,
      },
      select: { // Sadece gerekli alanları döndür
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);

  } catch (error: unknown) {
    // Use the extracted targetUserId for logging
    console.error(`Error updating role for user ${targetUserId}:`, error);

    // Prisma'nın belirli hatalarını yakala (örn. kullanıcı bulunamadı)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
    }

    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
} 