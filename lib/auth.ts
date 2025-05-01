import { AuthOptions, User as NextAuthUser/*, Session*/ } from "next-auth"; // Session kullanılmıyor
import { /*JWT*/ } from "next-auth/jwt"; // JWT kullanılmıyor
import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google"; // Kullanılmıyor
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";
import bcrypt from 'bcryptjs';

// NextAuth'un User ve Session tiplerini genişlet
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }

  interface User {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}

export const authOptions: AuthOptions = {
  // @ts-expect-error // Adapter tip uyumsuzluğu (NextAuth vs @auth/prisma-adapter) - geçici çözüm
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials/*, req*/): Promise<NextAuthUser | null> { // req kullanılmıyor
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
        } as NextAuthUser & { role: string };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user/*, account, profile*/, trigger, session }) { // account, profile kullanılmıyor
      if (user) {
        token.id = user.id;
        token.role = (user as NextAuthUser & { role: string }).role || 'user';
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (trigger === "update" && session?.user?.role) {
        token.role = session.user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};