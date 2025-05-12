import { AuthOptions, User as NextAuthUser/*, Session*/ } from "next-auth"; // Session kullanılmıyor
import { JWT } from "next-auth/jwt"; // JWT kullanılmıyor
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
  // @ts-expect-error Adapter tip uyumsuzluğu (NextAuth vs @auth/prisma-adapter)
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        try {
          if (!credentials?.email || !credentials.password) {
            throw new Error("Email and password required");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user || !user.password) {
            throw new Error("Invalid email or password");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            throw new Error("Invalid email or password");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role || "user", // Default role if not set
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }): Promise<JWT> {
      try {
        if (user) {
          token.id = user.id;
          token.role = user.role || "user";
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
        }
        
        if (trigger === "update" && session?.user) {
          token.role = session.user.role || token.role;
          token.name = session.user.name || token.name;
          token.email = session.user.email || token.email;
          token.picture = session.user.image || token.picture;
        }
        
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }): Promise<any> {
      try {
        if (token) {
          session.user.id = token.id;
          session.user.role = token.role || "user";
          session.user.name = token.name;
          session.user.email = token.email;
          session.user.image = token.picture;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};