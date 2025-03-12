"use client"

import { LoginForm } from "@/components/login-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if(status === "authenticated"){
      router.push("/dashboard");
    }
  }, [status,router]);
  if(status === "loading"){
    return <p>Loading...</p>;
  }


  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
