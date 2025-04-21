/**
 * Auth Context
 * 
 * Bu context, kimlik doğrulama durumunu ve fonksiyonlarını uygulamanın
 * farklı bileşenlerine sağlar. NextAuth.js ile entegre çalışır.
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Session } from "next-auth";
import { 
  SessionProvider,
  useSession, 
  signIn as nextAuthSignIn, 
  signOut as nextAuthSignOut
} from "next-auth/react";

// Auth Context'in türü
interface AuthContextType {
  status: "loading" | "authenticated" | "unauthenticated";
  data: Session | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

// Context oluşturma
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a type for the field errors from Zod
type FieldErrors = {
  [key: string]: string[] | undefined;
};

// Define a type for the error details from the API
interface ErrorDetails {
  fieldErrors?: FieldErrors;
  formErrors?: string[];
}

// Define a custom error class to hold detailed registration errors
export class RegisterError extends Error {
  details: ErrorDetails;

  constructor(message: string, details: ErrorDetails) {
    super(message);
    this.name = 'RegisterError';
    this.details = details;
    // Set the prototype explicitly for correct instanceof checks
    Object.setPrototypeOf(this, RegisterError.prototype);
  }
}

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, status } = useSession();

  /**
   * Kullanıcı girişi fonksiyonu
   * @param email Kullanıcı email adresi
   * @param password Kullanıcı şifresi
   * @returns Giriş başarılı ise true, değilse false
   */
  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
      });

      return !response?.error;
    } catch (error) {
      console.error("Giriş hatası:", error);
      return false;
    }
  };

  /**
   * Kullanıcı kaydı fonksiyonu
   * @param name Kullanıcı adı
   * @param email Kullanıcı email adresi
   * @param password Kullanıcı şifresi
   * @returns Kayıt başarılı ise true
   * @throws {RegisterError} If validation fails with details.
   * @throws {Error} If registration fails for other reasons.
   */
  const signUp = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Kayıt hatası:", errorBody);

        // Check if the error response contains Zod validation details
        if (errorBody.details && errorBody.details.fieldErrors) {
          throw new RegisterError(errorBody.error || "Validation failed", errorBody.details);
        } else {
          // Throw a general error for other issues (like email conflict)
          throw new Error(errorBody.error || `Request failed with status ${response.status}`);
        }
      }

      // Kayıt başarılı ise otomatik giriş yap
      return await signIn(email, password);
    } catch (error) {
      // Re-throw the error if it's one we created, otherwise log and throw a generic one
      if (error instanceof RegisterError || (error instanceof Error && error.message !== 'Failed to fetch')) {
        throw error; 
      } else {
        console.error("Unexpected Registration error:", error);
        throw new Error("An unexpected error occurred during registration.");
      }
    }
  };

  /**
   * Kullanıcı çıkışı fonksiyonu
   */
  const signOut = async (): Promise<void> => {
    await nextAuthSignOut({ redirect: false });
  };

  return (
    <AuthContext.Provider
      value={{
        data,
        status,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Auth context hook'u
 * @returns Auth context değerlerini döndürür
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Auth Provider Wrapper
 * NextAuth'un SessionProvider'ı ile birlikte çalışan bir wrapper
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}