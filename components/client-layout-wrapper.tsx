'use client'

import { usePathname } from "next/navigation"
import { AuthProviderWrapper } from "@/contexts/AuthContext"
import { SessionProvider, useSession } from "next-auth/react"

function ClientContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const isGameScreen = pathname.startsWith("/singleplayer/play") || pathname.startsWith("/multiplayer/game")
  const { status } = useSession()

  // If not authenticated and not on a public route, show loading state
  if (status === "loading" && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-indigo-900">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    )
  }

  return isGameScreen ? (
    // 🎮 Oyun ekranı için sade yapı
    <>{children}</>
  ) : (
    // 🌐 Normal sayfalar için Auth sarmalayıcı
    <AuthProviderWrapper>
      {children}
    </AuthProviderWrapper>
  )
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClientContent>{children}</ClientContent>
    </SessionProvider>
  )
}
