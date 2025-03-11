/**
 * NextAuth.js API Route
 * 
 * Bu dosya, NextAuth.js kimlik doğrulama sisteminin ana yapılandırma dosyasıdır.
 * Oturum yönetimi, kimlik doğrulama sağlayıcıları ve veritabanı adaptörü burada yapılandırılır.
 */

import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import prisma from "@/lib/prisma";

// NextAuth.js yapılandırma seçenekleri
export const authOptions: NextAuthOptions = {
  // Prisma adaptörü - veritabanı ile entegrasyon sağlar
  adapter: PrismaAdapter(prisma),
  
  // Kimlik doğrulama sağlayıcıları
  providers: [
    // Email/şifre kimlik doğrulama sağlayıcısı
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // Kimlik doğrulama mantığı
      async authorize(credentials) {
        // Credentials kontrol
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Kullanıcıyı email ile bul
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        // Kullanıcı bulunamadıysa veya şifre yoksa
        if (!user || !user.password) {
          return null;
        }

        // Şifre karşılaştırma
        const passwordValid = await compare(credentials.password, user.password);

        // Şifre geçerli değilse
        if (!passwordValid) {
          return null;
        }

        // Kullanıcı doğrulandığında dönen veriler
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role
        };
      }
    })
  ],
  
  // Oturum yapılandırması
  session: {
    strategy: "jwt"
  },
  
  // JWT yapılandırması
  jwt: {
    // JWT'nin geçerlilik süresi (30 gün)
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  
  // Sayfalar yapılandırması
  pages: {
    signIn: "/login", // Özel giriş sayfası
    signOut: "/", // Çıkış sonrası yönlendirme
    error: "/login", // Hata sayfası
  },
  
  // Callback fonksiyonları
  callbacks: {
    // JWT oluşturulduğunda çağrılır
    async jwt({ token, user }) {
      // Kullanıcı bilgisi varsa (ilk giriş)
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
      }
      return token;
    },
    
    // Oturum oluşturulduğunda çağrılır
    async session({ session, token }) {
      // Token varsa kullanıcı bilgilerini oturuma ekle
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  
  // Debug modunu sadece development ortamında etkinleştir
  debug: process.env.NODE_ENV === "development",
  
  // Güvenlik yapılandırması
  secret: process.env.NEXTAUTH_SECRET,
};

// NextAuth handler'ını export et
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 