'use client'

import { usePathname } from "next/navigation"
import { AuthProviderWrapper } from "@/contexts/AuthContext"

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const isGameScreen = pathname.startsWith("/singleplayer/play")

  if (isGameScreen) {
    // 🎮 Oyun ekranı için sade yapı
    return <>{children}</>
  }

  // 🌐 Normal sayfalar için Auth sarmalayıcı
  return (
    <AuthProviderWrapper>
      {children}
    </AuthProviderWrapper>
  )
}
