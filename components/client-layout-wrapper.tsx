'use client'

import { usePathname } from "next/navigation"
import { AuthProviderWrapper } from "@/contexts/AuthContext"
import { SessionProvider } from "next-auth/react"

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const isGameScreen = pathname.startsWith("/singleplayer/play")

  return (
    <SessionProvider>
      {
        isGameScreen ? (
          // 🎮 Oyun ekranı için sade yapı
          <>{children}</>
        ) : (
          // 🌐 Normal sayfalar için Auth sarmalayıcı
          <AuthProviderWrapper>
            {children}
          </AuthProviderWrapper>
        )
      }
    </SessionProvider>
  )
}
