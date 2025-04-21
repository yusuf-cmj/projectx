/**
 * Kullanıcı Kayıt API Endpoint'i
 * 
 * Bu API endpoint'i, yeni kullanıcıların sisteme kaydedilmesini sağlar.
 * Email ve şifre doğrulaması yapılır, şifre güvenli bir şekilde hashlenip saklanır.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { hash } from "bcrypt";
import { z } from "zod";

// Kayıt isteği için veri şeması
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export async function POST(request: NextRequest) {
  try {
    // İstek verilerini al
    const body = await request.json();

    // Veri doğrulama
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      // Log detailed validation errors
      console.error("Validation errors:", result.error.flatten()); 
      // Doğrulama hataları - Keep backend error message in Turkish for consistency if desired, or change it.
      // Let's change it to English for consistency.
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.flatten() }, 
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
        { error: "This email address is already in use" }, 
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { message: "User created successfully", user: userWithoutPassword }, 
      { status: 201 }
    );

  } catch (error) {
    // Log the actual error object for better debugging
    console.error("Registration error:", error); 
    return NextResponse.json(
      { error: "An error occurred while creating the user" }, 
      { status: 500 }
    );
  }
} 