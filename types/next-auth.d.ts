/**
 * NextAuth için TypeScript tür genişletmeleri
 * 
 * Bu dosya, NextAuth.js tarafından sağlanan varsayılan türleri
 * uygulamamıza özgü alanlarla genişletir.
 */

import "next-auth";
import { DefaultSession } from "next-auth";

// Varsayılan oturum kullanıcı tipini genişletme
declare module "next-auth" {
  /**
   * Session türünü genişleterek kullanıcıya özel alanlar ekleme
   */
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  /**
   * JWT içeriğini genişletme
   */
  interface JWT {
    id: string;
    role: string;
  }

  /**
   * Kullanıcı türünü genişletme
   */
  interface User {
    id: string;
    role: string;
  }
} 