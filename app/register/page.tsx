"use client"

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RegisterForm } from "@/components/register-form"

export default function Page() {
  const { status } = useSession();
  const router = useRouter();  

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-900 to-indigo-900">
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="text-white text-xl animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // Prevent form flash while redirecting
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-900 to-indigo-900">
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}