/**
 * Kullanıcı Kayıt API Endpoint'i
 * 
 * Bu API endpoint'i, yeni kullanıcıların sisteme kaydedilmesini sağlar.
 * Email ve şifre doğrulaması yapılır, şifre güvenli bir şekilde hashlenip saklanır.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { z } from "zod";

// Kayıt isteği için veri şeması
const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır")
});

export async function POST(request: NextRequest) {
  try {
    // İstek verilerini al
    const body = await request.json();
    
    // Veri doğrulama
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      // Doğrulama hataları
      return NextResponse.json(
        { error: "Geçersiz giriş verileri", details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    const { name, email, password } = result.data;
    
    // Email adresi zaten kullanılıyor mu kontrol et
    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanılıyor" },
        { status: 409 }
      );
    }
    
    // Şifreyi hashle
    const hashedPassword = await hash(password, 12);
    
    // Kullanıcıyı veritabanına kaydet
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });
    
    // Şifreyi gizleyerek yanıt dön
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      { message: "Kullanıcı başarıyla oluşturuldu", user: userWithoutPassword },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Kayıt hatası:", error);
    return NextResponse.json(
      { error: "Kullanıcı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
} 