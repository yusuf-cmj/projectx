"use client"

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RegisterForm } from "@/components/register-form"

export default function Page() {

  const { data: session, status } = useSession(); // Oturum durumunu al
  const router = useRouter();  

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard"); // Oturum varsa dashboard'a yönlendir
    }
  }, [status, router]);

  if (status === "loading") {
    return <p>Loading...</p>; // Yükleniyor durumu
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm />
      </div>
    </div>
  )
}